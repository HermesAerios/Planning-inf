import urllib.request
import json
import random

addresses = [
    "Rte de la Capite 175I, 1222 Collonge-Bellerive",
    "Chem. du Bournoud 23, 1217 Meyrin",
    "Chem. du Fief-de-Chapitre 3, 1213 Lancy",
    "Rue du Nant 7, 1207 Genève",
    "Av. Choiseul 14, 1290 Versoix",
    "Av. François-Besson 2, 1217 Meyrin",
    "Chem. Frank-Thomas 10, 1208 Genève",
    "Rte des Franchises 26, 1203 Genève",
    "Av. Ernest-Pictet 32, 1203 Genève",
    "Rue Camille-Martin 7, 1203 Genève",
    "Rte de Thonon 19, 1223 Vésenaz",
    "Av. Adrien-Jeandin 3, 1226 Thônex",
    "Av. des Tilleuls 34, 1203 Genève",
    "Rue des Savoises 10, 1205 Genève",
    "Chem. de la Fontaine 40, 1292 Pregny-Chambésy",
    "Chem. Edouard-Olivet 13, 1226 Thônex",
    "Chem. de Grange-Canal 42, 1224 Chêne-Bougeries",
    "Chem. de Planta 15, 1223 Cologny",
    "Chem. Taverney, 1218 Le Grand-Saconnex",
    "Rue de Bâle 16, 1201 Genève",
    "Rue Baudit 1, 1201 Genève",
    "Rue Lamartine 3B, 1203 Genève",
    "Chem. du Fief-de-Chapitre 8, 1213 Petit-Lancy",
    "Av. Adrien-Jeandin 36, 1226 Thônex",
    "Av. de Vaudagne 88, 1217 Meyrin",
    "Chem. de la Vendée 29, 1213 Petit-Lancy",
    "Rue Liotard 77, 1203 Genève",
    "Rue Liotard 83, 1203 Genève",
    "Av. de l'Ermitage 1, 1224 Chêne-Bougeries",
    "Av. des Morgines 47, 1213 Petit-Lancy"
]

url = "http://localhost:8000/api/patients/"
headers = {
    "Content-Type": "application/json"
}

# Backend API request for testing.
# Let's check auth.py or main.py. If it requires auth, we might get 401. 
# Usually, patient endpoints are protected by `get_current_user`.
# Let's bypass the API and use the crud directly since we are inside the container.

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import engine, SessionLocal
from app.crud.patient import patient as crud_patient
from app.schemas.patient import PatientCreate

db = SessionLocal()

for i, addr in enumerate(addresses, 1):
    print(f"Adding Patient {i}...")
    p_in = PatientCreate(
        nom=f"Patient {i}",
        adresse=addr
    )
    try:
        crud_patient.create(db, obj_in=p_in)
        print(f" -> OK")
    except Exception as e:
        print(f" -> ERROR: {e}")

db.close()
print("Terminé!")
