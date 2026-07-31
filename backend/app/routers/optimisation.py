from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from ..models.user import User
from ..routers.auth import get_current_user
from ..crud import patient as crud_patient
from ..services import optimisation_service
from ..models.setting import AppSetting
from ..core.celery_app import USE_CELERY
import uuid

router = APIRouter(prefix="/optimisation", tags=["optimisation"])

class PatientCriteria(BaseModel):
    id: int
    a_jeun: bool = False
    retour_rapide: bool = False

class OptimisationRequest(BaseModel):
    patients: List[PatientCriteria]  # Changed from patient_ids
    nb_infirmiers: int = 3
    infirmier_ids: List[int] = []
    duree_max: int = 80
    date: str
    heure_debut: str = "07:30"
    
class OptimisationResponse(BaseModel):
    result: dict

# Simple Job Store for async (In-Memory for now, Redis in prod)
jobs = {}

@router.post("/optimiser")
async def optimiser(
    request: OptimisationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch patients
    patients = []
    for p_crit in request.patients:
        pid = p_crit.id
        p = crud_patient.get(db, id=pid)
        if p:
            patients.append(p)
            
    if not patients:
        raise HTTPException(status_code=400, detail="Aucun patient trouvé")

    # Fetch settings
    setting = db.query(AppSetting).first()
    depot_coords = [setting.depot_lon, setting.depot_lat] if setting else [6.1491002, 46.1910685]
    depot_name = setting.depot_address if setting else "Av. de la Roseraie 72, 1205 Genève"
    humanity_balance = setting.humanity_balance if setting else True

    # Call Service
    try:
        result = await optimisation_service.optimiser_tournees(
            patients=patients,
            nb_infirmiers=request.nb_infirmiers,
            duree_max_min=request.duree_max,
            start_time_str=request.heure_debut,
            depot_coords=depot_coords,
            depot_name=depot_name,
            humanity_balance=humanity_balance,
            default_intervention_duration=setting.default_intervention_duration if setting else 15
        )
        if not result:
             raise HTTPException(status_code=400, detail="Impossible de trouver une solution")
             
        return {"result": result}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimiser-async")
async def optimiser_async(
    request: OptimisationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "running"}
    
    # Fetch settings
    setting = db.query(AppSetting).first()
    depot_coords = [setting.depot_lon, setting.depot_lat] if setting else [6.1491002, 46.1910685]
    depot_name = setting.depot_address if setting else "Av. de la Roseraie 72, 1205 Genève"
    humanity_balance = setting.humanity_balance if setting else True
    default_duration = setting.default_intervention_duration if setting else 15
        
    patient_criteria_list = [{"id": p.id, "a_jeun": p.a_jeun, "retour_rapide": p.retour_rapide} for p in request.patients]
    request_dict = {
        "nb_infirmiers": request.nb_infirmiers,
        "infirmier_ids": request.infirmier_ids,
        "duree_max": request.duree_max,
        "heure_debut": request.heure_debut
    }
    
    if USE_CELERY:
        from ..tasks.optimisation_tasks import run_optimization_celery
        task = run_optimization_celery.delay(
            patient_criteria_list, request_dict, depot_coords, depot_name, humanity_balance, default_duration
        )
        job_id = task.id
    else:
        background_tasks.add_task(run_optimization_task, job_id, patient_criteria_list, request_dict, depot_coords, depot_name, humanity_balance, default_duration)
    
    return {"job_id": job_id}

async def run_optimization_task(job_id, patient_criteria_list, request_dict, depot_coords, depot_name, humanity_balance, default_duration):
    from ..database import SessionLocal
    db = SessionLocal()
    try:
        patients = []
        for p_criteria in patient_criteria_list:
            p = crud_patient.get(db, id=p_criteria['id'])
            if p:
                # Override per-optimization criteria
                p.test_a_jeun = p_criteria['a_jeun']
                p.retour_rapide_labo = p_criteria['retour_rapide']
                patients.append(p)
                
        from ..models.user import User
        infirmiers = []
        if request_dict.get('infirmier_ids'):
            infirmiers = db.query(User).filter(User.id.in_(request_dict['infirmier_ids'])).all()
        else:
            # Fallback to fetching nb_infirmiers users with role='infirmier'
            infirmiers = db.query(User).filter(User.role == 'infirmier').limit(request_dict['nb_infirmiers']).all()
            
        result = await optimisation_service.optimiser_tournees(
            patients=patients,
            nb_infirmiers=request_dict['nb_infirmiers'],
            infirmiers=infirmiers,
            duree_max_min=request_dict['duree_max'],
            start_time_str=request_dict['heure_debut'],
            depot_coords=depot_coords,
            depot_name=depot_name,
            humanity_balance=humanity_balance,
            default_intervention_duration=default_duration
        )
        jobs[job_id] = {"status": "done", "result": result}
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Job failed: {e}")
        jobs[job_id] = {"status": "error", "error": str(e)}
    finally:
        db.close()

@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    if USE_CELERY:
        from ..core.celery_app import celery_app
        task = celery_app.AsyncResult(job_id)
        if task.state == 'PENDING':
            return {"status": "running"}
        elif task.state == 'SUCCESS':
            return task.result # Should return {"status": "done", "result": ...}
        elif task.state == 'FAILURE':
            return {"status": "error", "error": str(task.info)}
        else:
            return {"status": "running"}
    else:
        job = jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job
