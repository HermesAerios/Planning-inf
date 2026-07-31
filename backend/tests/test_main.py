from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to Labo Tournées API"}

def test_health_check():
    # Assuming there is a health check or just relying on root
    response = client.get("/")
    assert response.status_code == 200

def test_login_failure():
    response = client.post(
        "/api/auth/login",
        data={"username": "wronguser", "password": "wrongpassword"},
        headers={"content-type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password"
