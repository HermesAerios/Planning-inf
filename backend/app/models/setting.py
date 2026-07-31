from sqlalchemy import Column, Integer, String, Float, Boolean
from ..database import Base

class AppSetting(Base):
    __tablename__ = "app_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    depot_name = Column(String, default="Cabinet Principal")
    depot_address = Column(String, default="Av. de la Roseraie 72, 1205 Genève")
    depot_lat = Column(Float, default=46.1910685)
    depot_lon = Column(Float, default=6.1491002)
    humanity_balance = Column(Boolean, default=True)
    
    # New Professional Settings
    default_intervention_duration = Column(Integer, default=15)
    enable_safety_margin = Column(Boolean, default=False)
    safety_margin_percent = Column(Integer, default=10)
    enable_break_time = Column(Boolean, default=False)
    break_duration = Column(Integer, default=45)
    max_patients_per_nurse = Column(Integer, default=25)
    max_tour_duration_hours = Column(Integer, default=8)
    theme_preference = Column(String, default="light")
    export_format = Column(String, default="excel")
    enable_data_purge = Column(Boolean, default=False)
    purge_after_days = Column(Integer, default=30)
    
    # Import Settings
    import_mode = Column(String, default="skip") # skip, update, replace
