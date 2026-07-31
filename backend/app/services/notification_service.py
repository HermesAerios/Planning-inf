from ..config import settings
from ..models.patient import Patient
import logging

# Mock logger
logger = logging.getLogger("notification")

class NotificationService:
    async def send_sms(self, patient: Patient, message: str):
        # Mock implementation
        logger.info(f"[SMS MOCK] To {patient.telephone}: {message}")
        print(f"--- SMS SENT to {patient.telephone} : {message} ---")
        return True

    async def send_email(self, patient: Patient, subject: str, body: str):
        # Mock implementation
        logger.info(f"[EMAIL MOCK] To {patient.email}: {subject}")
        print(f"--- EMAIL SENT to {patient.email} : {subject} ---")
        return True
        
    async def notify_tournee_patients(self, tournee_details: list):
        """
        Notify all patients in a tour about their estimated time.
        """
        count = 0
        for step in tournee_details:
            if step.patient_id and step.heure_prevue:
                # Fetch Patient from database
                # TODO: Inject DB session and fetch patient contact info
                pass
                pass
                # print(f"Notifying patient {step.patient_id} for {step.heure_prevue}")
                count += 1
        return count

notification_service = NotificationService()
