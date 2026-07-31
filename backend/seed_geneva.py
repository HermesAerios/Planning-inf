from app.database import SessionLocal
from app.models.patient import Patient
from app.models.tournee import Tournee, TourneeDetails
from app.utils.auth import get_password_hash
import random
from datetime import datetime

db = SessionLocal()

print("Cleaning database...")
# Clean dependent tables first
db.query(TourneeDetails).delete()
db.query(Tournee).delete()
db.query(Patient).delete()
db.commit()
print("Database cleaned.")

addresses = [
    "Rue du Rhône 40, 1204 Genève",
    "Rue de la Croix-d'Or 19, 1204 Genève",
    "Rue de Rive 4, 1204 Genève",
    "Place du Molard 5, 1204 Genève",
    "Quai du Mont-Blanc 19, 1201 Genève",
    "Rue de Lausanne 42, 1201 Genève",
    "Avenue de France 23, 1202 Genève",
    "Place des Nations, 1202 Genève",
    "Route de Meyrin 49, 1203 Genève",
    "Avenue Appia 20, 1202 Genève",
    "Rue de Lyon 77, 1203 Genève",
    "Avenue Wendt 12, 1203 Genève",
    "Rue de Saint-Jean 30, 1203 Genève",
    "Boulevard Carl-Vogt 60, 1205 Genève",
    "Avenue du Mail 15, 1205 Genève",
    "Rue de Carouge 50, 1205 Genève",
    "Avenue de Champel 24, 1206 Genève",
    "Route de Florissant 60, 1206 Genève",
    "Chemin Rieu 10, 1208 Genève",
    "Route de Chêne 40, 1208 Genève",
    "Rue des Eaux-Vives 80, 1207 Genève",
    "Quai Gustave-Ador 30, 1207 Genève",
    "Route de Frontenex 50, 1207 Genève",
    "Avenue Pictet-de-Rochemont 20, 1207 Genève",
    "Rue de Montchoisy 34, 1207 Genève",
    "Chemin de la Grande-Gorge 5, 1255 Veyrier", 
    "Route de Veyrier 100, 1227 Carouge",
    "Avenue Cardinal-Mermillod 36, 1227 Carouge",
    "Rue des Allobroges 15, 1227 Carouge",
    "Route de Drize 2, 1227 Carouge"
]

# Ensure we have 30 unique
while len(addresses) < 30:
    addresses.append(f"Rue de Genève {len(addresses)}, 1201 Genève")

first_names = ["Jean", "Marie", "Pierre", "Sophie", "Lucas", "Julie", "Thomas", "Laura", "Nicolas", "Emma", "David", "Lea", "Paul", "Sarah", "Marc", "Celine", "Julien", "Alice", "Michel", "Chloe", "Robert", "Manon", "Claude", "Camille", "Christian", "Anna", "Daniel", "Eva", "Bruno", "Nina"]
last_names = ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau", "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier", "Morel", "Girard", "Andre", "Lefevre", "Mercier", "Dupont", "Lambert", "Bonnet", "Francois", "Martinez"]

print("Seeding 30 patients...")
count = 0
for i, addr in enumerate(addresses):
    p = Patient(
        nom=last_names[i],
        prenom=first_names[i],
        date_naissance=datetime(1950 + (i % 40), 1, 1),
        adresse=addr,
        telephone=f"079{random.randint(1000000, 9999999)}",
        email=f"patient{i}@example.com",
        is_active=True,
        test_a_jeun=random.choice([True, False, False]), # 1/3 odds
        retour_rapide_labo=random.choice([True, False, False, False]), # 1/4 odds
        # Geneva center approx 46.2044, 6.1432
        # Random spread approx few km
        latitude=46.2044 + random.uniform(-0.03, 0.03),
        longitude=6.1432 + random.uniform(-0.04, 0.04)
    )
    db.add(p)
    count += 1

db.commit()
print(f"Created {count} patients.")
