from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ..services.geocoding_service import geocoding_service
from ..routers.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/geocoding", tags=["geocoding"])

class AddressValidationRequest(BaseModel):
    address: str

class GeocodeCandidate(BaseModel):
    address: str
    lat: float
    lon: float
    confidence: float
    match_type: str

class AddressValidationResponse(BaseModel):
    status: str # 'valid', 'ambiguous', 'invalid'
    candidates: List[GeocodeCandidate]

@router.post("/validate", response_model=AddressValidationResponse)
async def validate_address(
    req: AddressValidationRequest,
    current_user: User = Depends(get_current_user)
):
    candidates = await geocoding_service.search_candidates(req.address)
    
    if not candidates:
        return {"status": "invalid", "candidates": []}
        
    # Validation Logic
    # If 1 candidate with high confidence -> valid
    # If multiple candidates or low confidence -> ambiguous
    
    # Sort by confidence
    candidates.sort(key=lambda x: x['confidence'], reverse=True)
    
    top = candidates[0]
    
    # Thresholds
    HIGH_CONFIDENCE = 0.8
    
    if len(candidates) == 1 and top['confidence'] >= HIGH_CONFIDENCE:
        status = "valid"
    elif len(candidates) > 0 and top['confidence'] >= HIGH_CONFIDENCE:
        # Check if top 2 are very similar/duplicates or distinct
        # If top 1 is significantly better than top 2, assume valid
        if len(candidates) > 1 and (top['confidence'] - candidates[1]['confidence'] > 0.2):
             status = "valid"
        else:
             status = "ambiguous"
    else:
        status = "ambiguous" # Low confidence, ask user to confirm
        
    return {
        "status": status,
        "candidates": candidates
    }

@router.post("/autocomplete", response_model=List[GeocodeCandidate])
async def autocomplete_address(
    req: AddressValidationRequest,
    current_user: User = Depends(get_current_user)
):
    if not req.address or len(req.address) < 3:
        return []
        
    candidates = await geocoding_service.search_candidates(req.address)
    # Sort by confidence
    if candidates:
        candidates.sort(key=lambda x: x['confidence'], reverse=True)
        
    return candidates
