from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models.user import User
from ..models.tournee import Tournee, TourneeDetails
from ..routers.auth import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/tournees", tags=["tournees"])

class StepUpdate(BaseModel):
    status: str # 'todo', 'done', 'skipped'
    note: Optional[str] = None

class TourneeCreate(BaseModel):
    date: datetime
    user_id: Optional[int] = None # If null, unassigned or auto-assign?
    # In full app, we assign to specific nurse. 
    # Optimization result returns "vehicle_id". We map vehicle_id to users?
    # For now, let's assume vehicle_id 1 = user_id 2 (our seeder nurse 1)
    steps: List[dict]

class TourneeIds(BaseModel):
    ids: List[int]

class TourneeStep(BaseModel):
    id: int
    type: str
    patient_id: Optional[int]
    nom: str
    adresse: Optional[str]
    lat: Optional[float]
    lon: Optional[float]
    arrivee: Optional[str]
    depart: Optional[str]
    arrivee: Optional[str]
    depart: Optional[str]
    status: str
    notes: Optional[str] = None
    a_jeun: bool = False
    retour_rapide_labo: bool = False
    
class MyTournee(BaseModel):
    id: int
    date: datetime
    gmaps_link: Optional[str]
    steps: List[TourneeStep]

@router.post("/", response_model=TourneeIds)
def create_tournees_batch(
    tournees_in: List[TourneeCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    created_ids = []
    # Mapping vehicle to users (Demo: vehicle 1 -> user 2, vehicle 2 -> user 3, etc)
    # real app needs dynamic mapping
    
    # Mapping vehicle to users (Demo: vehicle 1 -> user 3, vehicle 2 -> user 4, etc)
    # real app needs dynamic mapping
    
    import uuid
    batch_id = str(uuid.uuid4())
    
    for i, t_in in enumerate(tournees_in):
        # Create Tournee
        nurse_id = t_in.user_id
        
        # Check if nurse exists or fallback
        if nurse_id:
             nurse = db.query(User).filter(User.id == nurse_id).first()
             if not nurse:
                 nurse_id = None # Invalid ID, unassign or fallback?

        if not nurse_id:
             # If no nurse specified, it's an unassigned tournee (Deferred)
             # status -> 'attente'
             statut = "attente"
        else:
             statut = "planifiee"
            
        db_tournee = Tournee(
            date=t_in.date,
            user_id=nurse_id,
            statut=statut,
            created_by_id=current_user.id,
            batch_id=batch_id
        )
        db.add(db_tournee)
        db.commit() # Commit to get ID
        db.refresh(db_tournee)
        created_ids.append(db_tournee.id)
        
        # Create Steps
        for idx, step_data in enumerate(t_in.steps):
            # step_data comes from optimisation result "steps" list
            # It has 'type', 'patient_id', 'nom', 'adresse', 'arrivee', 'depart'
            
            p_id = step_data.get('patient_id')
            action = step_data.get('type')
            if action == 'patient':
                action = None # Linked to patient
            elif 'depot' in action:
                action = 'Depot'
            
            # Parse times
            # Model has `heure_arrivee_estimee` (Time). 
            heure_arrivee = None
            if step_data.get('arrivee'):
                h, m = map(int, step_data.get('arrivee').split(':'))
                heure_arrivee = datetime.now().replace(hour=h, minute=m).time() # Use simple time object?

            detail = TourneeDetails(
                tournee_id=db_tournee.id,
                patient_id=p_id,
                infirmier_num=i+1, # Use loop index as infirmier num
                ordre=idx, # sequence -> ordre
                # action=action, # Model lacks action column based on review. Dropping it.
                heure_arrivee_estimee=heure_arrivee,
                statut="todo"
            )
            db.add(detail)
            
        db.commit()
        
    return {"ids": created_ids}

@router.get("/me", response_model=List[MyTournee])
def get_my_tournees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get active tournees for today or future?
    # For now, get all tournees assigned to user
    # In real app, filter by date = today
    tournees = db.query(Tournee).filter(Tournee.user_id == current_user.id).order_by(Tournee.date.desc()).limit(5).all()
    
    res = []
    for t in tournees:
        steps = []
        # Sort details by sequence if available, or id
        sort_details = sorted(t.details, key=lambda x: x.ordre)
        
        for d in sort_details:
            # Map DB model to response schema
            
            # Fetch patient info if available
            p_name = "Patient"
            p_addr = None
            is_a_jeun = False
            is_retour = False
            
            if d.patient:
                p_name = f"{d.patient.nom} {d.patient.prenom}"
                p_addr = d.patient.adresse
                is_a_jeun = d.patient.test_a_jeun
                is_retour = d.patient.retour_rapide_labo
            elif not d.patient_id:
                # Depot?
                p_name = "Point de passage" # Fallback since we can't store 'action'

            steps.append(TourneeStep(
                id=d.id,
                type="patient" if d.patient_id else "action",
                patient_id=d.patient_id,
                nom=p_name,
                adresse=p_addr,
                lat=None,
                lon=None,
                arrivee=d.heure_arrivee_estimee.strftime("%H:%M") if d.heure_arrivee_estimee else None,
                depart=d.heure_depart_estimee.strftime("%H:%M") if d.heure_depart_estimee else None,
                status=d.statut,
                notes=d.notes,
                a_jeun=is_a_jeun,
                retour_rapide_labo=is_retour
            ))
        
        # Generate GMaps Link
        from urllib.parse import quote_plus
        base_url = "https://www.google.com/maps/dir"
        from ..models.setting import AppSetting
        setting = db.query(AppSetting).first()
        depot_addr = setting.depot_address if setting and setting.depot_address else "Av. de la Roseraie 72, 1205 Genève"
        parts = [quote_plus(depot_addr)]
        for s in steps:
            if s.type == "patient" and s.adresse:
                 parts.append(quote_plus(s.adresse))
        parts.append(quote_plus(depot_addr))
        link = f"{base_url}/{'/'.join(parts)}"

        res.append(MyTournee(id=t.id, date=t.date, steps=steps, gmaps_link=link))
        
    return res

@router.get("/all")
def get_all_tournees(db: Session = Depends(get_db)):
    """Get all tournees for admin view, grouped by date and user"""
    from urllib.parse import quote_plus
    
    # Eager load details and their patients, and the user (nurse) + creator
    tournees = db.query(Tournee).options(
        joinedload(Tournee.details).joinedload(TourneeDetails.patient),
        joinedload(Tournee.user),
        joinedload(Tournee.creator)
    ).order_by(Tournee.date.desc()).all()
    
    res = []
    
    for t in tournees:
        # details are loaded, but need sorting
        details = sorted(t.details, key=lambda x: x.ordre)
        
        steps = []
        for d in details:
            steps.append({
                "id": d.id,
                "patient_id": d.patient_id,
                "type": "patient",
                "nom": d.patient.nom + " " + d.patient.prenom if d.patient else "Patient",
                "adresse": d.patient.adresse if d.patient else "",
                "arrivee": str(d.heure_arrivee_estimee) if d.heure_arrivee_estimee else "",
                "depart": str(d.heure_depart_estimee) if d.heure_depart_estimee else "",
                "status": d.statut
            })
        
        # Generate GMaps Link
        base_url = "https://www.google.com/maps/dir"

        from ..models.setting import AppSetting
        setting = db.query(AppSetting).first()
        depot_addr = setting.depot_address if setting and setting.depot_address else "Av. de la Roseraie 72, 1205 Genève"
        parts = [quote_plus(depot_addr)]
        for s in steps:
            if s["type"] == "patient" and s["adresse"]:
                 parts.append(quote_plus(s["adresse"]))
        parts.append(quote_plus(depot_addr))
        link = f"{base_url}/{'/'.join(parts)}"
        
        # Get usernames
        nurse_username = t.user.username if t.user else None
        creator_username = t.creator.username if t.creator else "Système/Inconnu"
        
        res.append({
            "id": t.id,
            "date": t.date,
            "user_id": t.user_id,
            "username": nurse_username,
            "creator_username": creator_username,
            "statut": t.statut,
            "created_at": t.created_at,
            "created_at": t.created_at,
            "steps": steps,
            "gmaps_link": link,
            "batch_id": t.batch_id
        })
    
    return res

class TourneeUpdate(BaseModel):
    user_id: Optional[int] = None
    statut: Optional[str] = None

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tournee(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != 'admin':
         raise HTTPException(status_code=403, detail="Non autorisé")
    
    tournee = db.query(Tournee).filter(Tournee.id == id).first()
    if not tournee:
         raise HTTPException(status_code=404, detail="Tournée non trouvée")
         
    db.delete(tournee)
    db.commit()
    return None

@router.post("/bulk-delete", status_code=status.HTTP_204_NO_CONTENT)
def bulk_delete_tournees(
    req: TourneeIds,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != 'admin':
         raise HTTPException(status_code=403, detail="Non autorisé")
    
    db.query(Tournee).filter(Tournee.id.in_(req.ids)).delete(synchronize_session=False)
    db.commit()
    return None

@router.patch("/{id}")
def update_tournee(
    id: int,
    tournee_update: TourneeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Non autorisé")
        
    tournee = db.query(Tournee).filter(Tournee.id == id).first()
    if not tournee:
        raise HTTPException(status_code=404, detail="Tournée non trouvée")
    
    if tournee_update.user_id:
        # Verify nurse exists
        nurse = db.query(User).filter(User.id == tournee_update.user_id).first()
        if not nurse or nurse.role != 'infirmier':
             raise HTTPException(status_code=400, detail="Infirmier invalide")
        tournee.user_id = tournee_update.user_id
        
    if tournee_update.statut:
        tournee.statut = tournee_update.statut
        
    db.commit()
    db.refresh(tournee)
    return tournee

@router.get("/export/csv")
def export_tournees_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Non autorisé")
        
    import csv
    from io import StringIO
    from fastapi.responses import StreamingResponse
    
    tournees = db.query(Tournee).order_by(Tournee.date.desc()).all()
    
    output = StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(['ID', 'Date', 'Infirmier', 'Statut', 'Durée (min)', 'Distance (km)'])
    
    for t in tournees:
        nurse_name = "Non assigné"
        if t.user_id:
            nurse = db.query(User).filter(User.id == t.user_id).first()
            if nurse:
                nurse_name = nurse.username
                
        writer.writerow([
            t.id,
            t.date,
            nurse_name,
            t.statut,
            t.duree_totale_min,
            t.distance_totale_m / 1000 if t.distance_totale_m else 0
        ])
        
    output.seek(0)
    
    filename = f"tournees_export_{datetime.now().strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# History Schemas
class HistoryBase(BaseModel):
    action: str
    details: Optional[str]
    signature: str
    comment: Optional[str]
    created_at: datetime
    user_id: Optional[int]
    username: Optional[str]

class ModificationRequest(BaseModel):
    patient_id: Optional[int] = None
    step_id: Optional[int] = None # For deletion
    signature: str
    comment: Optional[str]

@router.get("/{id}/history", response_model=List[HistoryBase])
def get_tournee_history(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from ..models.tournee import TourneeHistory
    history = db.query(TourneeHistory).filter(TourneeHistory.tournee_id == id).order_by(TourneeHistory.created_at.desc()).all()
    
    res = []
    for h in history:
        user = db.query(User).filter(User.id == h.user_id).first()
        username = user.username if user else "Inconnu"
        res.append(HistoryBase(
            action=h.action,
            details=h.details,
            signature=h.signature,
            comment=h.comment,
            created_at=h.created_at,
            user_id=h.user_id,
            username=username
        ))
    return res

@router.post("/{id}/steps/delete")
def delete_step_with_audit(
    id: int,
    req: ModificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify tournee matches
    tournee = db.query(Tournee).filter(Tournee.id == id).first()
    if not tournee:
         raise HTTPException(status_code=404, detail="Tournée non trouvée")
         
    step = db.query(TourneeDetails).filter(TourneeDetails.id == req.step_id, TourneeDetails.tournee_id == id).first()
    if not step:
         raise HTTPException(status_code=404, detail="Étape non trouvée")
    
    patient_name = "Inconnu"
    if step.patient:
        patient_name = f"{step.patient.nom} {step.patient.prenom}"
        
    db.delete(step)
    
    # Log History
    from ..models.tournee import TourneeHistory
    history = TourneeHistory(
        tournee_id=id,
        user_id=current_user.id,
        action="SUPPRESSION_PATIENT",
        details=f"Suppression du patient {patient_name} (Step {req.step_id})",
        signature=req.signature,
        comment=req.comment
    )
    db.add(history)
    db.commit()
    
    return {"status": "success"}

@router.post("/{id}/steps/add")
def add_step_with_audit(
    id: int,
    req: ModificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tournee = db.query(Tournee).filter(Tournee.id == id).first()
    if not tournee:
         raise HTTPException(status_code=404, detail="Tournée non trouvée")
    
    # Determine new order (last + 1)
    last_step = db.query(TourneeDetails).filter(TourneeDetails.tournee_id == id).order_by(TourneeDetails.ordre.desc()).first()
    new_order = (last_step.ordre + 1) if last_step else 0
    
    new_step = TourneeDetails(
        tournee_id=id,
        patient_id=req.patient_id,
        infirmier_num=1, # Default
        ordre=new_order,
        statut="todo",
        heure_arrivee_estimee=None # Manually added, time unknown unless recalc
    )
    db.add(new_step)
    
    # Log History
    from ..models.tournee import TourneeHistory
    history = TourneeHistory(
        tournee_id=id,
        user_id=current_user.id,
        action="AJOUT_PATIENT",
        details=f"Ajout du patient ID {req.patient_id}",
        signature=req.signature,
        comment=req.comment
    )
    db.add(history)
    db.commit()
    return {"status": "success"}

@router.post("/{id}/steps/{step_id}/complete")
def complete_step(
    id: int,
    step_id: int,
    update: StepUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify tournee belongs to user
    tournee = db.query(Tournee).filter(Tournee.id == id, Tournee.user_id == current_user.id).first()
    if not tournee:
        raise HTTPException(status_code=404, detail="Tournée non trouvée")
        
    step = db.query(TourneeDetails).filter(TourneeDetails.id == step_id, TourneeDetails.tournee_id == id).first()
    if not step:
         raise HTTPException(status_code=404, detail="Étape non trouvée")
         
    step.statut = update.status
    if update.note:
        step.notes = update.note
    
    current_time = datetime.now().time()
    
    if update.status == 'en_cours':
        step.heure_arrivee_reelle = current_time
    elif update.status in ['terminee', 'done']:
        step.heure_depart_reelle = current_time
        # If arrivee_reelle wasn't set (skipped 'en_cours'), set it to now too?
        if not step.heure_arrivee_reelle:
             step.heure_arrivee_reelle = current_time

    db.commit()
    db.refresh(step) # Refresh to ensure we have latest state if needed

    # Verify if all steps are completed
    # 'terminee', 'done', 'skipped', 'absent', 'probleme_adresse' indicate completion.
    
    unfinished_steps = db.query(TourneeDetails).filter(
        TourneeDetails.tournee_id == id,
        TourneeDetails.statut.in_(['todo', 'en_cours'])
    ).count()

    if unfinished_steps == 0:
        # All steps handled
        tournee.statut = 'terminee'
        db.commit()
        
    return {"status": "success"}
