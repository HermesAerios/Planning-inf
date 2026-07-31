import sqlite3
from datetime import datetime, timedelta
import json
import hashlib
from ..config import settings
import os

CACHE_DB = "cache/cache.sqlite3"
GEOCODE_TTL_DAYS = 30
MATRIX_TTL_DAYS = 14

def init_cache():
    if not os.path.exists("cache"):
        os.makedirs("cache")
        
    con = sqlite3.connect(CACHE_DB)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS geocode_cache (
            adresse TEXT PRIMARY KEY,
            latitude REAL,
            longitude REAL,
            updated_at TEXT
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS matrix_cache (
            key TEXT PRIMARY KEY,
            distances TEXT,
            durations TEXT,
            updated_at TEXT
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS route_cache (
            key TEXT PRIMARY KEY,
            geometry TEXT,
            updated_at TEXT
        )
    """)
    con.commit()
    con.close()

def is_fresh(updated_at_str: str, ttl_days: int) -> bool:
    updated_at = datetime.fromisoformat(updated_at_str)
    return datetime.utcnow() - updated_at < timedelta(days=ttl_days)

def get_geocode(adresse: str) -> tuple | None:
    """Retourne (lat, lon) si en cache et frais"""
    try:
        con = sqlite3.connect(CACHE_DB)
        cur = con.cursor()
        cur.execute("SELECT latitude, longitude, updated_at FROM geocode_cache WHERE adresse = ?", (adresse,))
        row = cur.fetchone()
        con.close()
        
        if not row:
            return None
        
        lat, lon, updated_at = row
        if is_fresh(updated_at, GEOCODE_TTL_DAYS):
            return (lat, lon)
        return None
    except Exception as e:
        print(f"Cache Error: {e}")
        return None

def set_geocode(adresse: str, lat: float, lon: float):
    try:
        con = sqlite3.connect(CACHE_DB)
        cur = con.cursor()
        cur.execute("""
            INSERT INTO geocode_cache (adresse, latitude, longitude, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(adresse) DO UPDATE SET
                latitude = excluded.latitude,
                longitude = excluded.longitude,
                updated_at = excluded.updated_at
        """, (adresse, lat, lon, datetime.utcnow().isoformat()))
        con.commit()
        con.close()
    except Exception as e:
        print(f"Cache Write Error: {e}")

def get_matrix(key: str) -> tuple | None:
    """Retourne (distances, durations) si en cache et frais"""
    try:
        con = sqlite3.connect(CACHE_DB)
        cur = con.cursor()
        cur.execute("SELECT distances, durations, updated_at FROM matrix_cache WHERE key = ?", (key,))
        row = cur.fetchone()
        con.close()
        
        if not row:
            return None
        
        distances, durations, updated_at = row
        if is_fresh(updated_at, MATRIX_TTL_DAYS):
            return (json.loads(distances), json.loads(durations))
        return None
    except Exception as e:
        print(f"Matrix Cache Error: {e}")
        return None

def set_matrix(key: str, distances: list, durations: list):
    try:
        con = sqlite3.connect(CACHE_DB)
        cur = con.cursor()
        cur.execute("""
            INSERT INTO matrix_cache (key, distances, durations, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                distances = excluded.distances,
                durations = excluded.durations,
                updated_at = excluded.updated_at
        """, (key, json.dumps(distances), json.dumps(durations), datetime.utcnow().isoformat()))
        con.commit()
        con.close()
    except Exception as e:
        print(f"Matrix Cache Write Error: {e}")

def get_route(key: str) -> dict | None:
    try:
        con = sqlite3.connect(CACHE_DB)
        cur = con.cursor()
        cur.execute("SELECT geometry, updated_at FROM route_cache WHERE key = ?", (key,))
        row = cur.fetchone()
        con.close()
        
        if not row:
            return None
        
        geometry, updated_at = row
        if is_fresh(updated_at, MATRIX_TTL_DAYS):
            return json.loads(geometry)
        return None
    except Exception as e:
        print(f"Route Cache Error: {e}")
        return None

def set_route(key: str, geometry: dict):
    try:
        con = sqlite3.connect(CACHE_DB)
        cur = con.cursor()
        cur.execute("""
            INSERT INTO route_cache (key, geometry, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                geometry = excluded.geometry,
                updated_at = excluded.updated_at
        """, (key, json.dumps(geometry), datetime.utcnow().isoformat()))
        con.commit()
        con.close()
    except Exception as e:
        print(f"Route Cache Write Error: {e}")


# Call init on module load just in case, but robustly
try:
    init_cache()
except Exception as e:
    print(f"Failed to init cache on module load: {e}")
