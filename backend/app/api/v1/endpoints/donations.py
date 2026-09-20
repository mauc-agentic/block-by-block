# app/api/v1/endpoints/donations.py
# UC-009, UC-014: Donations endpoints

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import get_settings
from app.core.security import get_current_user
from app.db import get_db
from app.db.models import Cause, CauseStatus, Donation
from app.schemas import (
    UserResponse,
    DonateRequest,
    DonationResponse,
    DonationConfirmRequest,
    DonationRecordResponse,
)
from app.services.chain import (
    get_token_address,
    read_donation_received,
    vault_address,
)
from app.services.reconcile import sync_completed_status
from app.utils.helpers import convert_usdt_to_wei, convert_wei_to_usdt

router = APIRouter(prefix="/causes", tags=["donations"])
settings = get_settings()


@router.post("/{cause_id}/donate", response_model=DonationResponse)
def donate(
    cause_id: int,
    req: DonateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """UC-009: Instrucciones de firma para donar (approve del token + donate); el donante firma (BR-004)."""

    cause = db.query(Cause).filter(Cause.id == cause_id).first()

    if not cause:
        raise HTTPException(status_code=404, detail="Cause not found")

    if cause.status != CauseStatus.Verified.value:
        raise HTTPException(status_code=400, detail="Only verified causes")  # A4, A5, BR-001

    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount > 0")

    if not current_user.wallet_address:
        raise HTTPException(status_code=400, detail="Link a wallet first")

    amount_wei = convert_usdt_to_wei(req.amount)

    return DonationResponse(
        status="sign_required",
        contract=vault_address(),
        function="donate",
        params=[cause.onchain_cause_id, amount_wei],
        message=f"Sign to donate {req.amount} USDT to '{cause.title}'",
        approve={
            "contract": get_token_address(),
            "function": "approve",
            "params": [vault_address(), amount_wei],
        },
    )


@router.post("/{cause_id}/donations/confirm", response_model=DonationRecordResponse)
def confirm_donation(
    cause_id: int,
    req: DonationConfirmRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """UC-014: Registra una donación leyendo la tx confirmada en el contrato (solo lectura, BR-001/BR-003)."""

    cause = db.query(Cause).filter(Cause.id == cause_id).first()
    if not cause:
        raise HTTPException(status_code=404, detail="Cause not found")
    if cause.onchain_cause_id is None:
        raise HTTPException(status_code=400, detail="Cause is not published on-chain")

    existing = db.query(Donation).filter(Donation.tx_hash == req.tx_hash.lower()).first()
    if existing:  # A2 / BR-002
        if existing.cause_id != cause.id or existing.donor_id != current_user.id:
            raise HTTPException(status_code=409, detail="Transaction already registered")
        return _record(existing, cause)

    event = read_donation_received(req.tx_hash)
    if event is None:
        raise HTTPException(status_code=400, detail="Transaction not confirmed or not a donation")  # A1, A4

    # A3: debe ser una donación a esta causa desde la wallet vinculada del donante
    if (
        event["cause_id"] != cause.onchain_cause_id
        or not current_user.wallet_address
        or event["donor"].lower() != current_user.wallet_address.lower()
    ):
        raise HTTPException(status_code=400, detail="Transaction does not match this cause and wallet")

    donation = Donation(
        cause_id=cause.id,
        donor_id=current_user.id,
        amount=convert_wei_to_usdt(event["amount"]),
        tx_hash=req.tx_hash.lower(),
    )
    db.add(donation)
    try:
        db.commit()
    except IntegrityError:  # carrera con otra petición del mismo hash
        db.rollback()
        existing = db.query(Donation).filter(Donation.tx_hash == req.tx_hash.lower()).one()
        return _record(existing, cause)
    db.refresh(donation)

    sync_completed_status(db, cause)  # BR-004: Completed lo decide el contrato

    return _record(donation, cause)


def _record(donation: Donation, cause: Cause) -> DonationRecordResponse:
    return DonationRecordResponse(
        id=donation.id,
        cause_id=donation.cause_id,
        amount=donation.amount,
        tx_hash=donation.tx_hash,
        created_at=donation.created_at,
        cause_status=cause.status,
    )
