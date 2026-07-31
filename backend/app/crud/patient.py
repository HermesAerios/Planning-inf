from typing import List, Optional
from sqlalchemy.orm import Session
from .base import CRUDBase
from ..models.patient import Patient
from ..schemas.patient import PatientCreate, PatientUpdate
from ..models.skill import Skill

class CRUDPatient(CRUDBase[Patient, PatientCreate, PatientUpdate]):
    def get_by_nom(self, db: Session, *, nom: str) -> List[Patient]:
        return db.query(self.model).filter(self.model.nom.ilike(f"%{nom}%")).all()

    def get_multi_filtered(
        self, db: Session, *, skip: int = 0, limit: int = 100, search: Optional[str] = None
    ) -> List[Patient]:
        query = db.query(self.model)
        if search:
            query = query.filter(
                (self.model.nom.ilike(f"%{search}%")) |
                (self.model.prenom.ilike(f"%{search}%")) |
                (self.model.adresse.ilike(f"%{search}%"))
            )
        return query.order_by(self.model.updated_at.desc()).offset(skip).limit(limit).all()

    def create(self, db: Session, *, obj_in: PatientCreate) -> Patient:
        obj_data = obj_in.model_dump(exclude={'skill_ids'})
        db_obj = self.model(**obj_data)
        
        if obj_in.skill_ids:
            skills = db.query(Skill).filter(Skill.id.in_(obj_in.skill_ids)).all()
            db_obj.skills_required = skills

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: Patient, obj_in: PatientUpdate) -> Patient:
        obj_data = obj_in.model_dump(exclude_unset=True, exclude={'skill_ids'})
        
        for field in obj_data:
            setattr(db_obj, field, obj_data[field])

        if obj_in.skill_ids is not None:
            skills = db.query(Skill).filter(Skill.id.in_(obj_in.skill_ids)).all()
            db_obj.skills_required = skills

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

patient = CRUDPatient(Patient)
