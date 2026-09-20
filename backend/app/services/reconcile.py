# reconcile.py
# UC-016: registra en la plataforma las donaciones confirmadas en el contrato que el donante no llegó a registrar.
# Solo lectura sobre la red (C-009); idempotente por hash de transacción.

import logging
from typing import Optional

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import get_settings
from app.db.models import Cause, CauseStatus, Donation, User
from app.services import chain
from app.utils.helpers import convert_wei_to_usdt

logger = logging.getLogger(__name__)
settings = get_settings()

MAX_LOOKBACK_BLOCKS = 500_000  # sin bloque de despliegue configurado se revisan solo los bloques recientes


def sync_completed_status(db: Session, cause: Cause) -> None:
    """UC-014 BR-004: Completed lo decide el contrato; la plataforma solo lo refleja."""
    if cause.onchain_cause_id is None or cause.status == CauseStatus.Completed.value:
        return
    state = chain.read_cause_state(cause.onchain_cause_id)
    if state and state["status"] == chain.CAUSE_STATUS_COMPLETED:
        cause.status = CauseStatus.Completed.value
        db.commit()


def reconcile_donations(db: Session, from_block: Optional[int] = None) -> list[int]:
    """
    Registra las donaciones del contrato que faltan y devuelve los ids de las filas creadas.

    A1 se omite la donación si ninguna cuenta tiene vinculada la wallet donante; A2 si la causa on-chain no es de la plataforma;
    A3 si la red no responde no se toca nada. BR-001: un hash ya registrado (por UC-014 o por una ejecución previa) se ignora.
    """
    try:
        latest = chain.get_w3().eth.block_number
    except Exception:
        logger.warning("UC-016 A3: RPC not reachable, nothing reconciled")
        return []
    start = from_block if from_block is not None else max(settings.cause_vault_start_block, latest - MAX_LOOKBACK_BLOCKS, 0)

    events = chain.read_donation_logs(start, latest)
    if events is None:
        logger.warning("UC-016 A3: could not read donation logs, nothing reconciled")
        return []

    created: list[int] = []
    for event in events:
        if db.query(Donation).filter(Donation.tx_hash == event["tx_hash"]).first():
            continue  # BR-001
        cause = db.query(Cause).filter(Cause.onchain_cause_id == event["cause_id"]).first()
        if cause is None:
            continue  # A2
        donor = db.query(User).filter(func.lower(User.wallet_address) == event["donor"].lower()).first()
        if donor is None:
            continue  # A1
        donation = Donation(cause_id=cause.id, donor_id=donor.id, amount=convert_wei_to_usdt(event["amount"]), tx_hash=event["tx_hash"])
        db.add(donation)
        try:
            db.commit()
        except IntegrityError:  # carrera con UC-014
            db.rollback()
            continue
        created.append(donation.id)
        sync_completed_status(db, cause)
    if created:
        logger.info("UC-016: registered %s missing donations %s", len(created), created)
    return created
