from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Dict, Any
from datetime import date, timedelta
from ..database import get_db
from ..models.patient import Patient
from ..models.tournee import Tournee, TourneeDetails
from ..models.user import User
from ..routers.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())
    end_of_week = start_of_week + timedelta(days=6)
    
    # 1. Active Patients (Total count for now)
    active_patients_count = db.query(Patient).count()
    
    # 2. Tours counts
    tours_today = db.query(Tournee).filter(Tournee.date == today).count()
    tours_week = db.query(Tournee).filter(
        and_(Tournee.date >= start_of_week, Tournee.date <= end_of_week)
    ).count()
    
    # 3. Alerts
    alerts = []
    
    # Delayed tours: Past date but not 'terminee' or 'annulee' (and status != 'terminee')
    # Assuming 'terminee' means done. 'statut' default is 'planifiee'.
    delayed_tours = db.query(Tournee).filter(
        and_(
            Tournee.date < today,
            Tournee.statut.notin_(['terminee', 'annulee'])
        )
    ).all()
    
    for t in delayed_tours:
        alerts.append({
            "type": "retard",
            "message": f"Tournée du {t.date} (#{t.id}) non terminée",
            "link": "/tournees" # Or specific link
        })
        
    # Unvisited patients today: Patients not in any tour today
    # Get all patient IDs in today's tours
    patients_in_tours_today = db.query(TourneeDetails.patient_id).join(Tournee).filter(
        Tournee.date == today
    ).distinct().all()
    
    patient_ids_today = [p[0] for p in patients_in_tours_today]
    
    # Count of unvisited patients (useful metric, maybe listing all is too much for alert)
    # Let's verify how many total patients vs visited
    unvisited_count = active_patients_count - len(patient_ids_today)
    
    if unvisited_count > 0:
        alerts.append({
            "type": "info",
            "message": f"{unvisited_count} patients non visités aujourd'hui",
            "link": "/optimisation" # Prompt to create tour
        })
        
    return {
        "active_patients": active_patients_count,
        "tours_today": tours_today,
        "tours_week": tours_week,
        "alerts": alerts
    }
