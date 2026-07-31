from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from ..database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Could be null if system action or unauth
    action = Column(String(50), nullable=False) # e.g., 'READ', 'CREATE', 'UPDATE', 'DELETE'
    resource_type = Column(String(50)) # e.g., 'patient', 'tournee'
    resource_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True) # JSON or text description
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
