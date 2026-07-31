from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime, date
import re
from .skill import Skill

class PatientBase(BaseModel):
    nom: str
    prenom: Optional[str] = ""
    adresse: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    telephone: Optional[str] = None
    email: Optional[EmailStr] = None
    date_naissance: Optional[date] = None
    is_active: bool = True
    heure_preferee: Optional[str] = None  # Format "HH:MM-HH:MM"
    test_a_jeun: bool = False
    retour_rapide_labo: bool = False
    preference_notification: str = "both"  # 'sms', 'email', 'both', 'none'
    notes: Optional[str] = None
    recurrence_days: Optional[str] = None
    
    @field_validator('email', 'date_naissance', 'telephone', 'heure_preferee', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "":
            return None
        return v
    
    @field_validator('nom')
    @classmethod
    def validate_names(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Le nom doit contenir au moins 2 caractères')
        return v.strip()
    
    @field_validator('adresse')
    @classmethod
    def validate_address(cls, v):
        if not v or len(v.strip()) < 5:
            raise ValueError('L\'adresse doit être renseignée')
        return v.strip()
    
    @field_validator('telephone')
    @classmethod
    def validate_phone(cls, v):
        if v:
            # Remove spaces and common separators
            cleaned = re.sub(r'[\s\-\.\(\)]', '', v)
            # Check if it's a valid phone number (Swiss format or international)
            if not re.match(r'^(\+41|0041|0)?[1-9]\d{8,9}$', cleaned):
                raise ValueError('Format de téléphone invalide (ex: +41 79 123 45 67 ou 079 123 45 67)')
        return v
    
    @field_validator('heure_preferee')
    @classmethod
    def validate_heure(cls, v):
        if v:
            # Valider format HH:MM-HH:MM
            if not re.match(r'^\d{2}:\d{2}-\d{2}:\d{2}$', v):
                raise ValueError('Format attendu: HH:MM-HH:MM (exemple: 08:00-09:00)')
        return v
    
    @field_validator('preference_notification')
    @classmethod
    def validate_pref(cls, v):
        if v not in ['sms', 'email', 'both', 'none']:
             raise ValueError("Doit être 'sms', 'email', 'both' ou 'none'")
        return v

class PatientCreate(PatientBase):
    skill_ids: list[int] = []

class PatientUpdate(PatientBase):
    skill_ids: Optional[list[int]] = None

class PatientInDB(PatientBase):
    id: int
    created_at: datetime
    updated_at: datetime
    skills_required: list[Skill] = []
    
    class Config:
        from_attributes = True
