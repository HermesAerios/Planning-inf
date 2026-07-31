import httpx as requests # Alias for compatibility
import time
import random
import string
import os
import sys

# Configuration
API_URL = "http://127.0.0.1:8000/api"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin" # Default seed password
NUM_PATIENTS = 100

def get_token():
    print(f"Logging in as {ADMIN_EMAIL} at {API_URL}...")
    retries = 5
    for i in range(retries):
        try:
            # Increase timeout for login
            resp = requests.post(f"{API_URL}/auth/token", data={
                "username": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            }, timeout=10.0)
            resp.raise_for_status()
            print("Login success.")
            return resp.json()["access_token"]
        except Exception as e:
            print(f"Login failed (Attempt {i+1}/{retries}): {e}")
            time.sleep(2)
    return None

def generate_patient(i):
    return {
        "nom": f"LoadTestUser_{i}",
        "prenom": f"Test_{i}",
        "adresse": "6 rue de la Colline, 1204 Genève", # Use same address to avoid geocoding errors/costs
        "telephone": "0790000000",
        "email": f"test{i}@example.com",
        "date_naissance": "1990-01-01",
        "is_active": True
    }

def seed_patients(token):
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Seeding {NUM_PATIENTS} patients...")
    
    start_time = time.time()
    success_count = 0
    
    # Use Client for connection reuse
    with requests.Client(timeout=30.0) as client:
        for i in range(NUM_PATIENTS):
            p = generate_patient(i)
            try:
                r = client.post(f"{API_URL}/patients/", json=p, headers=headers)
                if r.status_code in [200, 201]:
                    success_count += 1
                elif r.status_code == 409: # Already exists
                    success_count += 1 # Count as success/skip
                    
                if i % 100 == 0:
                    print(f"Progress: {i}/{NUM_PATIENTS}")
            except Exception as e:
                print(f"Error creating patient {i}: {e}")
            
    duration = time.time() - start_time
    print(f"Seeding finished. {success_count} created in {duration:.2f}s ({success_count/duration:.2f} req/s)")

def run_optimization(token):
    headers = {"Authorization": f"Bearer {token}"}
    print("Triggering optimization for ALL patients...")
    
    with requests.Client(timeout=300.0) as client:
        # 1. Fetch all patients IDs
        print("Fetching patient list...")
        try:
            r = client.get(f"{API_URL}/patients/", headers=headers, params={"limit": 2000})
            patients = r.json()
            patient_ids = [p["id"] for p in patients if p["is_active"]] # Assuming list format
            # If backend returns dict with 'data', adjust here. Currently it returns list.
            print(f"Found {len(patient_ids)} active patients to optimize.")
            
            if not patient_ids:
                print("No patients to optimize.")
                return

            # 2. Call optimize
            patients_payload = [{"id": pid} for pid in patient_ids]
            payload = {
                "date": "2026-01-02T08:00:00",
                "patients": patients_payload,
                "nb_infirmiers": 5
            }
            
            start_time = time.time()
            print("Sending optimization request (this may take time)...")
            r = client.post(f"{API_URL}/optimisation/optimiser", json=payload, headers=headers)
            
            if r.status_code == 200:
                data = r.json()
                print("Optimization Success!")
                # print(data) 
            else:
                print(f"Optimization Failed: {r.status_code} - {r.text}")

        except Exception as e:
            print(f"Optimization Error: {e}")
            
        duration = time.time() - start_time
        print(f"Optimization cycle took {duration:.2f}s")

if __name__ == "__main__":
    print("--- Antigravity Load Test ---")
    token = get_token()
    if token:
        if "--auto" in sys.argv:
            print("Auto mode: Seeding and Optimizing...")
            seed_patients(token)
            run_optimization(token)
        else:
            cmd = input("Seed 1000 patients? (y/n): ")
            if cmd.lower() == 'y':
                seed_patients(token)
                
            cmd = input("Run Optimization? (y/n): ")
            if cmd.lower() == 'y':
                run_optimization(token)
            
    print("Done.")
