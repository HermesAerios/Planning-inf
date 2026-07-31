from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from datetime import datetime
import io
from ..models.tournee import TourneeDetails, Tournee

class PDFService:
    def generate_tournee_pdf(self, tournee: Tournee, details: list[TourneeDetails]) -> bytes:
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Header
        c.setFont("Helvetica-Bold", 16)
        c.drawString(2*cm, 28*cm, f"Feuille de Route - Tournée #{tournee.id}")
        
        c.setFont("Helvetica", 12)
        c.drawString(2*cm, 27*cm, f"Date: {tournee.date.strftime('%d/%m/%Y')}")
        # Retrieve user details if loaded
        c.drawString(2*cm, 26.5*cm, f"Infirmier ID: {tournee.user_id}")
        
        # Table Header
        y = 25*cm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(2*cm, y, "Heure")
        c.drawString(4*cm, y, "Patient / Action")
        c.drawString(10*cm, y, "Adresse")
        c.drawString(17*cm, y, "Statut")
        
        y -= 0.5*cm
        c.line(2*cm, y, 19*cm, y)
        y -= 1*cm
        
        c.setFont("Helvetica", 10)
        
        for step in details:
            if y < 2*cm:
                c.showPage()
                y = 28*cm
            
            heure = step.heure_prevue.strftime("%H:%M") if step.heure_prevue else "--:--"
            nom = step.action or "Patient"
            adresse = "Voir détails"
            
            c.drawString(2*cm, y, heure)
            c.drawString(4*cm, y, nom[:30])
            c.drawString(10*cm, y, adresse[:35])
            c.drawString(17*cm, y, step.statut)
            
            y -= 1*cm

        c.save()
        buffer.seek(0)
        return buffer.getvalue()

pdf_service = PDFService()
