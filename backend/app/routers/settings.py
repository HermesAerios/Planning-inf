from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..models.setting import AppSetting
from ..models.user import User
from ..routers.auth import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])

class SettingsResponse(BaseModel):
    id: int
    depot_name: str
    depot_address: str
    depot_lat: float
    depot_lon: float
    humanity_balance: bool
    default_intervention_duration: int
    enable_safety_margin: bool
    safety_margin_percent: int
    enable_break_time: bool
    break_duration: int
    max_patients_per_nurse: int
    max_tour_duration_hours: int
    theme_preference: str
    export_format: str
    enable_data_purge: bool
    purge_after_days: int
    import_mode: str

class SettingsUpdate(BaseModel):
    depot_name: Optional[str] = None
    depot_address: Optional[str] = None
    depot_lat: Optional[float] = None
    depot_lon: Optional[float] = None
    humanity_balance: Optional[bool] = None
    default_intervention_duration: Optional[int] = None
    enable_safety_margin: Optional[bool] = None
    safety_margin_percent: Optional[int] = None
    enable_break_time: Optional[bool] = None
    break_duration: Optional[int] = None
    max_patients_per_nurse: Optional[int] = None
    max_tour_duration_hours: Optional[int] = None
    theme_preference: Optional[str] = None
    export_format: Optional[str] = None
    enable_data_purge: Optional[bool] = None
    purge_after_days: Optional[int] = None
    import_mode: Optional[str] = None

def get_or_create_settings(db: Session) -> AppSetting:
    setting = db.query(AppSetting).first()
    if not setting:
        setting = AppSetting()
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting

@router.get("/", response_model=SettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Any logged in user can read settings? Maybe only admin for some, but nurses need it for routes ?
    # Let's allow any authenticated user to read.
    return get_or_create_settings(db)

@router.patch("/", response_model=SettingsResponse)
def update_settings(
    update_data: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Non autorisé. Réservé aux administrateurs.")
        
    setting = get_or_create_settings(db)
    
    if update_data.depot_name is not None:
        setting.depot_name = update_data.depot_name
    if update_data.depot_address is not None:
        setting.depot_address = update_data.depot_address
    if update_data.depot_lat is not None:
        setting.depot_lat = update_data.depot_lat
    if update_data.depot_lon is not None:
        setting.depot_lon = update_data.depot_lon
    if update_data.humanity_balance is not None:
        setting.humanity_balance = update_data.humanity_balance
        
    # Apply new professional settings
    if update_data.default_intervention_duration is not None: setting.default_intervention_duration = update_data.default_intervention_duration
    if update_data.enable_safety_margin is not None: setting.enable_safety_margin = update_data.enable_safety_margin
    if update_data.safety_margin_percent is not None: setting.safety_margin_percent = update_data.safety_margin_percent
    if update_data.enable_break_time is not None: setting.enable_break_time = update_data.enable_break_time
    if update_data.break_duration is not None: setting.break_duration = update_data.break_duration
    if update_data.max_patients_per_nurse is not None: setting.max_patients_per_nurse = update_data.max_patients_per_nurse
    if update_data.max_tour_duration_hours is not None: setting.max_tour_duration_hours = update_data.max_tour_duration_hours
    if update_data.theme_preference is not None: setting.theme_preference = update_data.theme_preference
    if update_data.export_format is not None: setting.export_format = update_data.export_format
    if update_data.enable_data_purge is not None: setting.enable_data_purge = update_data.enable_data_purge
    if update_data.enable_data_purge is not None: setting.enable_data_purge = update_data.enable_data_purge
    if update_data.purge_after_days is not None: setting.purge_after_days = update_data.purge_after_days
    if update_data.import_mode is not None: setting.import_mode = update_data.import_mode
        
    db.commit()
    db.refresh(setting)
    return setting
