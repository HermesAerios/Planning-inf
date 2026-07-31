from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.skill import Skill
from ..schemas.user import UserCreate, UserInDB
from ..utils.auth import get_password_hash
from sqlalchemy.orm import joinedload

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=list[UserInDB])
def read_users(db: Session = Depends(get_db)): #, current_user: User = Depends(get_current_user)
    # Check if admin logic here if needed
    users = db.query(User).options(joinedload(User.skills)).all()
    return users

@router.post("/", response_model=UserInDB)
def create_user(user: UserCreate, db: Session = Depends(get_db)): #, current_user: User = Depends(get_current_user)
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username,
        password_hash=hashed_password,
        role=user.role
    )
    
    if user.skill_ids:
        skills = db.query(Skill).filter(Skill.id.in_(user.skill_ids)).all()
        new_user.skills = skills
        
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)): #, current_user: User = Depends(get_current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting self or last admin if needed
    # if user.id == current_user.id: ...
    
    db.delete(user)
    db.commit()
    return None
