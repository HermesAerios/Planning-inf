from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from ..database import Base

class NotificationLog(Base):
    __tablename__ = "notifications_log"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    type = Column(String(10), nullable=False) # 'sms', 'email'
    contenu = Column(Text)
    statut = Column(String(20)) # 'envoye', 'echec'
    erreur = Column(Text)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())


