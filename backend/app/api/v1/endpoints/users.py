# app/api/v1/endpoints/users.py
# UC-011: Ver dashboard

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db import get_db
from app.db.models import Cause
from app.schemas import UserResponse, CauseResponse, DashboardResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me/dashboard", response_model=DashboardResponse)
def get_dashboard(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """UC-011: Resumen personal del usuario autenticado.

    BR-002: solo se consultan las causas del propio `current_user` (derivado
    del JWT), nunca de un id recibido por parámetro, por lo que un usuario no
    puede ver el dashboard de otro.
    """
    causes = (
        db.query(Cause)
        .filter(Cause.recipient_id == current_user.id)
        .order_by(Cause.created_at.desc())
        .all()
    )

    return DashboardResponse(
        user=current_user,
        causes=[CauseResponse.from_orm(c) for c in causes],
    )
