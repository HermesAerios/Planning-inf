import sys
import os

# Add backend directory to sys.path to resolve imports
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.patient import Patient
from app.models.tournee import Tournee, TourneeDetails
from app.utils.auth import get_password_hash
from datetime import datetime, date, time

def init_db():
    Base.metadata.create_all(bind=engine)

def seed():
    # init_db() # Removed to rely on Alembic
    db = SessionLocal()

    # Users
    if not db.query(User).filter(User.username == "admin").first():
        admin = User(
            username="admin",
            password_hash=get_password_hash("admin123"),
            email="admin@labo.com",
            role="admin"
        )
        db.add(admin)

    if not db.query(User).filter(User.username == "planif").first():
        planif = User(
            username="planif",
            password_hash=get_password_hash("planif123"),
            role="planificateur"
        )
        db.add(planif)

    infirmiers = []
    for i in range(1, 4):
        username = f"infirmier{i}"
        if not db.query(User).filter(User.username == username).first():
            inf = User(
                username=username,
                password_hash=get_password_hash(f"infirmier{i}123"),
                role="infirmier"
            )
            db.add(inf)
            infirmiers.append(inf)
    
    # Patients Demo
    patients_data = [
        {"nom": "Dupont", "prenom": "Marie", "adresse": "10 Rue de la Terrassière, 1207 Genève", "a_jeun": True},
        {"nom": "Martin", "prenom": "Paul", "adresse": "5 Avenue de Frontenex, 1207 Genève", "a_jeun": False},
        {"nom": "Dubois", "prenom": "Jean", "adresse": "15 Rue du Rhône, 1204 Genève", "a_jeun": False},
        {"nom": "Petit", "prenom": "Julie", "adresse": "8 Rue de la Rôtisserie, 1204 Genève", "a_jeun": True},
        {"nom": "Blanc", "prenom": "Sophie", "adresse": "2 Place du Molard, 1204 Genève", "a_jeun": False},
    ]

    for p_data in patients_data:
        if not db.query(Patient).filter(Patient.nom == p_data["nom"]).first():
            p = Patient(
                nom=p_data["nom"],
                prenom=p_data["prenom"],
                adresse=p_data["adresse"],
                test_a_jeun=p_data["a_jeun"],
                latitude=46.2 + (0.001 * len(p_data["nom"])), # Fake coords for now
                longitude=6.15 + (0.001 * len(p_data["nom"])),
                email=f"{p_data['nom'].lower()}@example.com"
            )
            db.add(p)

    db.commit()
    print("Seed data injected successfully.")

if __name__ == "__main__":
    seed()
