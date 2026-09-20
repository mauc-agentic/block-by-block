# app/api/v1/endpoints/donations.py
# UC-009: Donations endpoint

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.core import get_settings
from app.core.security import get_current_user
from app.db import get_db
from app.db.models import Cause, CauseStatus
from app.schemas import (
    UserResponse,
    DonateRequest,
    DonationResponse,
)

router = APIRouter(prefix="/causes", tags=["donations"])
settings = get_settings()

@router.post("/{cause_id}/donate", response_model=DonationResponse)
def donate(
    cause_id: int,
    req: DonateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """UC-009: Donar a una causa."""
    
    cause = db.query(Cause).filter(Cause.id == cause_id).first()
    
    if not cause:
        raise HTTPException(status_code=404, detail="Cause not found")
    
    if cause.status != CauseStatus.Verified.value:
        raise HTTPException(status_code=400, detail="Only verified causes")
    
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount > 0")
    
    amount_wei = int(req.amount * (10 ** 6))
    
    return DonationResponse(
        status="sign_required",
        contract=settings.cause_vault_address,
        function="donate",
        params=[cause_id, amount_wei],
        message=f"Sign to donate {req.amount} USDT to '{cause.title}'"
    )
