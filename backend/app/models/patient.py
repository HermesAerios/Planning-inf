from sqlalchemy import Column, Integer, String, Text, Boolean, DECIMAL, DateTime, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
from ..core.security_encryption import EncryptedString

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(EncryptedString(500), nullable=False)
    prenom = Column(EncryptedString(500), nullable=False)
    adresse = Column(EncryptedString, nullable=False)
    latitude = Column(DECIMAL(10, 8))
    longitude = Column(DECIMAL(11, 8))
    telephone = Column(EncryptedString(255))
    email = Column(EncryptedString(500))
    date_naissance = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    heure_preferee = Column(String(20)) # '08:00-09:00'
    test_a_jeun = Column(Boolean, default=False)
    retour_rapide_labo = Column(Boolean, default=False)
    preference_notification = Column(String(20), default='both') # 'sms', 'email', 'both', 'none'
    notes = Column(EncryptedString)
    recurrence_days = Column(String(100), nullable=True) # e.g. "1,3,5" for Mon,Wed,Fri
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    skills_required = relationship("Skill", secondary="patient_skills", backref="patients")
