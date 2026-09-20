# app/api/v1/endpoints/users.py
# UC-011: Dashboard de donante y de receptor

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db import get_db
from app.db.models import Cause, CauseStatus, Donation, User
from app.schemas import (
    DashboardResponse,
    DonorDashboard,
    DonorDonationItem,
    RecipientCauseItem,
    RecipientDashboard,
    UserResponse,
)
from app.services.chain import read_cause_state
from app.utils.helpers import convert_wei_to_usdt

from app.api.v1.endpoints.causes import collected_by_cause

router = APIRouter(prefix="/users", tags=["users"])

WITHDRAWABLE = {CauseStatus.Verified.value, CauseStatus.Completed.value}


@router.get("/{user_id}", response_model=DashboardResponse)
def dashboard(
    user_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """UC-011: Resumen según el rol; cada usuario solo ve el suyo (BR-001, BR-002)."""

    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot view another user's dashboard")

    user = db.query(User).filter(User.id == user_id).first()
    response = DashboardResponse(
        user=UserResponse.from_orm(user),
        wallet_linked=bool(user.wallet_address),
    )

    if user.user_type == "donor":
        rows = (
            db.query(Donation, Cause.title)
            .join(Cause, Cause.id == Donation.cause_id)
            .filter(Donation.donor_id == user.id)
            .order_by(Donation.created_at.desc())
            .all()
        )
        response.donor = DonorDashboard(
            total_donated=sum((d.amount for d, _ in rows), Decimal("0")),
            donations=[
                DonorDonationItem(cause_id=d.cause_id, cause_title=title, amount=d.amount,
                                  tx_hash=d.tx_hash, created_at=d.created_at)
                for d, title in rows
            ],
        )
    else:
        causes = db.query(Cause).filter(Cause.recipient_id == user.id).order_by(Cause.created_at.desc()).all()
        collected = collected_by_cause(db, [c.id for c in causes])
        items = []
        for c in causes:
            available = None
            if c.onchain_cause_id is not None and c.status in WITHDRAWABLE:
                state = read_cause_state(c.onchain_cause_id)
                if state is not None:
                    available = convert_wei_to_usdt(state["collected"])
            items.append(RecipientCauseItem(
                id=c.id, title=c.title, status=c.status, target_amount=c.target_amount,
                collected=collected.get(c.id, Decimal("0")), available_to_withdraw=available,
            ))
        response.recipient = RecipientDashboard(causes=items)

    return response
