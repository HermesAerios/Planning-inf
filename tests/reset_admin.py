from app.database import SessionLocal
from app.models.user import User
from app.utils.auth import get_password_hash

db = SessionLocal()

# 1. Debug: List all users
print("--- Current Users ---")
users = db.query(User).all()
for u in users:
    print(f"ID: {u.id}, Username: '{u.username}', Role: {u.role}")
print("---------------------")

# 2. Fix Admin
# Priority: use 'admin' if exists
u_admin = db.query(User).filter(User.username == "admin").first()
u_email = db.query(User).filter(User.username == "admin@example.com").first()

target_user = None

if u_admin:
    print("Found user 'admin'. Updating password...")
    target_user = u_admin
elif u_email:
    print("Found user 'admin@example.com'. Renaming to 'admin'...")
    u_email.username = "admin"
    target_user = u_email
else:
    print("No admin found. Creating 'admin'...")
    target_user = User(
        username="admin",
        email="admin@example.com",
        password_hash="",
        role="admin"
    )
    db.add(target_user)

# Set password
target_user.password_hash = get_password_hash("admin123")
target_user.role = "admin"
try:
    db.commit()
    print(f"SUCCESS: User '{target_user.username}' password set to 'admin123'")
except Exception as e:
    print(f"ERROR: {e}")
    db.rollback()

print("Done.")
