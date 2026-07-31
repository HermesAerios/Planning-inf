from sqlalchemy import Column, Integer, String, Date, Time, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
from sqlalchemy.types import DateTime

class Tournee(Base):
    __tablename__ = "tournees"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Assigned nurse
    duree_totale_min = Column(Integer)
    distance_totale_m = Column(Integer)
    statut = Column(String(20), default='planifiee') # 'planifiee', 'en_cours', 'terminee', 'annulee'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    batch_id = Column(String(50), nullable=True)

    details = relationship("TourneeDetails", back_populates="tournee", cascade="all, delete-orphan")
    user = relationship("User", foreign_keys=[user_id])
    creator = relationship("User", foreign_keys=[created_by_id])

class TourneeHistory(Base):
    __tablename__ = "tournee_history"

    id = Column(Integer, primary_key=True, index=True)
    tournee_id = Column(Integer, ForeignKey("tournees.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(50), nullable=False)
    details = Column(Text)
    signature = Column(String(100))
    comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TourneeDetails(Base):
    __tablename__ = "tournees_details"

    id = Column(Integer, primary_key=True, index=True)
    tournee_id = Column(Integer, ForeignKey("tournees.id", ondelete="CASCADE"))
    infirmier_num = Column(Integer, nullable=False) # 1, 2, 3...
    patient_id = Column(Integer, ForeignKey("patients.id"))
    ordre = Column(Integer, nullable=False)
    heure_arrivee_estimee = Column(Time)
    heure_depart_estimee = Column(Time)
    heure_arrivee_reelle = Column(Time)
    heure_depart_reelle = Column(Time)
    statut = Column(String(20), default='a_faire') # 'a_faire', 'en_cours', 'termine', 'absent'
    notes = Column(Text)
    gmaps_link = Column(Text)

    tournee = relationship("Tournee", back_populates="details")
    patient = relationship("Patient")
