from app.database import SessionLocal
from app.models.user import User
from app.utils.auth import get_password_hash

db = SessionLocal()

nurses = [
    {"username": "infirmier1", "password": "infirmier1123"},
    {"username": "infirmier2", "password": "infirmier2123"},
    {"username": "infirmier3", "password": "infirmier3123"},
]

print("Ensuring nurse accounts...")
for n in nurses:
    u = db.query(User).filter(User.username == n["username"]).first()
    if not u:
        print(f"Creating {n['username']}...")
        user = User(
            username=n["username"],
            email=f"{n['username']}@example.com",
            password_hash=get_password_hash(n["password"]),
            role="infirmier"
        )
        db.add(user)
    else:
        print(f"User {n['username']} exists. Updating password...")
        u.password_hash = get_password_hash(n["password"])
        u.role = "infirmier"

db.commit()
print("Done.")
