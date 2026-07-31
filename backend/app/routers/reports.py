from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.tournee import Tournee, TourneeDetails
from ..routers.auth import get_current_user
from ..services import pdf_service

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/tournee/{id}/pdf")
def get_tournee_pdf(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tournee = db.query(Tournee).filter(Tournee.id == id).first()
    if not tournee:
        raise HTTPException(status_code=404, detail="Tournée non trouvée")
        
    details = db.query(TourneeDetails).filter(TourneeDetails.tournee_id == id).order_by(TourneeDetails.sequence).all()
    
    pdf_bytes = pdf_service.generate_tournee_pdf(tournee, details)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=tournee_{id}.pdf"}
    )
