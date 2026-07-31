import asyncio
from ..core.celery_app import celery_app
from ..database import SessionLocal
from ..crud import patient as crud_patient
from ..services import optimisation_service
import traceback

def run_async(coro):
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(coro)

@celery_app.task(bind=True, name="optimisation.run_optimization")
def run_optimization_celery(self, patient_criteria_list, request_dict, depot_coords, depot_name, humanity_balance, default_duration):
    db = SessionLocal()
    try:
        patients = []
        for p_criteria in patient_criteria_list:
            p = crud_patient.get(db, id=p_criteria['id'])
            if p:
                p.test_a_jeun = p_criteria['a_jeun']
                p.retour_rapide_labo = p_criteria['retour_rapide']
                patients.append(p)
                
        from ..models.user import User
        infirmiers = []
        if request_dict.get('infirmier_ids'):
            infirmiers = db.query(User).filter(User.id.in_(request_dict['infirmier_ids'])).all()
        else:
            infirmiers = db.query(User).filter(User.role == 'infirmier').limit(request_dict['nb_infirmiers']).all()
            
        # Call the async service from a sync celery task
        result = run_async(optimisation_service.optimiser_tournees(
            patients=patients,
            nb_infirmiers=request_dict['nb_infirmiers'],
            infirmiers=infirmiers,
            duree_max_min=request_dict['duree_max'],
            start_time_str=request_dict['heure_debut'],
            depot_coords=depot_coords,
            depot_name=depot_name,
            humanity_balance=humanity_balance,
            default_intervention_duration=default_duration
        ))
        
        return {"status": "done", "result": result}
        
    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "error": str(e)}
    finally:
        db.close()
