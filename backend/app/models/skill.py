from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from ..database import Base

user_skills = Table('user_skills', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete="CASCADE"), primary_key=True),
    Column('skill_id', Integer, ForeignKey('skills.id', ondelete="CASCADE"), primary_key=True)
)

patient_skills = Table('patient_skills', Base.metadata,
    Column('patient_id', Integer, ForeignKey('patients.id', ondelete="CASCADE"), primary_key=True),
    Column('skill_id', Integer, ForeignKey('skills.id', ondelete="CASCADE"), primary_key=True)
)

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
