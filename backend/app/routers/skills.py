from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.user import User
from ..models.skill import Skill
from ..schemas.skill import SkillCreate, Skill as SkillSchema
from ..routers.auth import get_current_user

router = APIRouter(prefix="/skills", tags=["skills"])

@router.get("/", response_model=List[SkillSchema])
def read_skills(db: Session = Depends(get_db)):
    return db.query(Skill).all()

@router.post("/", response_model=SkillSchema)
def create_skill(skill: SkillCreate, db: Session = Depends(get_db)):
    db_skill = db.query(Skill).filter(Skill.name == skill.name).first()
    if db_skill:
        raise HTTPException(status_code=400, detail="Skill already exists")
    new_skill = Skill(name=skill.name)
    db.add(new_skill)
    db.commit()
    db.refresh(new_skill)
    return new_skill

@router.delete("/{id}")
def delete_skill(id: int, db: Session = Depends(get_db)):
    skill = db.query(Skill).filter(Skill.id == id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    db.delete(skill)
    db.commit()
    return {"message": "Skill deleted"}
