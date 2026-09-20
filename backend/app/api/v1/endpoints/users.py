# app/api/v1/endpoints/users.py
# UC-011: Ver dashboard

from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.api.v1.endpoints.causes import cause_response, collected_by_cause, donations_by_cause
from app.core.security import get_current_user
from app.db import get_db
from app.db.models import Cause, CauseStatus, Donation
from app.schemas import DashboardCause, DashboardResponse, DonorDonationItem, UserResponse
from app.services.chain import read_cause_state
from app.utils.helpers import convert_wei_to_usdt

router = APIRouter(prefix="/users", tags=["users"])

WITHDRAWABLE = {CauseStatus.Verified.value, CauseStatus.Completed.value}


@router.get("/me/dashboard", response_model=DashboardResponse)
def get_dashboard(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """UC-011: Resumen del usuario autenticado: sus causas y sus donaciones.

    BR-002: los datos salen siempre del `current_user` (derivado del JWT), nunca de un id recibido
    por parámetro, por lo que un usuario no puede ver el dashboard de otro.
    """
    causes = (
        db.query(Cause).options(joinedload(Cause.recipient), joinedload(Cause.verification))
        .filter(Cause.recipient_id == current_user.id)
        .order_by(Cause.created_at.desc())
        .all()
    )
    ids = [c.id for c in causes]
    collected = collected_by_cause(db, ids)
    donations_of = donations_by_cause(db, ids)
    items = []
    for c in causes:
        available = None
        if c.onchain_cause_id is not None and c.status in WITHDRAWABLE:
            state = read_cause_state(c.onchain_cause_id)
            if state is not None:
                available = convert_wei_to_usdt(state["collected"])
        detail = cause_response(c, collected=collected.get(c.id, Decimal("0")), donations=donations_of.get(c.id, []))
        items.append(DashboardCause(**detail.model_dump(), available_to_withdraw=available))

    donations = (
        db.query(Donation, Cause.title)
        .join(Cause, Cause.id == Donation.cause_id)
        .filter(Donation.donor_id == current_user.id)
        .order_by(Donation.created_at.desc())
        .all()
    )
    return DashboardResponse(
        user=current_user,
        wallet_linked=bool(current_user.wallet_address),
        causes=items,
        total_donated=sum((d.amount for d, _ in donations), Decimal("0")),
        donations=[
            DonorDonationItem(cause_id=d.cause_id, cause_title=title, amount=d.amount,
                              tx_hash=d.tx_hash, created_at=d.created_at)
            for d, title in donations
        ],
    )
