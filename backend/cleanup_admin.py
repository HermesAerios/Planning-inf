from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()

# Delete non-primary admins to clean up
duplicates = db.query(User).filter(User.username != "admin", User.role == "admin").all()
for u in duplicates:
    print(f"Deleting duplicate admin: {u.username} (ID: {u.id})")
    db.delete(u)
    
db.commit()
print("Cleanup done.")
