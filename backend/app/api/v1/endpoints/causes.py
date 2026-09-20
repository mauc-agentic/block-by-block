# app/api/v1/endpoints/causes.py
# UC-004, UC-005, UC-007, UC-008, UC-013: Causes endpoints

from fastapi import APIRouter, HTTPException, Depends, File, Response, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
import hashlib

from app.core import get_settings
from app.core.security import get_current_user
from app.db import get_db
from app.db.models import Cause, CauseStatus, Evidence
from app.schemas import (
    UserResponse,
    CauseCreate,
    CauseResponse,
    CauseListResponse,
    PublishInstruction,
    PublishConfirmRequest,
)
from app.services.chain import read_cause_created
from app.tasks import enqueue_verification
from app.core.constants import MAX_IMAGE_SIZE_BYTES
from app.utils.helpers import convert_usdt_to_wei

router = APIRouter(prefix="/causes", tags=["causes"])
settings = get_settings()

@router.post("", response_model=CauseResponse)
def create_cause(
    cause_data: CauseCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """UC-004: Crear causa. Cualquier usuario autenticado puede publicar una causa."""

    db_cause = Cause(
        recipient_id=current_user.id,
        title=cause_data.title,
        description=cause_data.description,
        target_amount=cause_data.target_amount,
        status=CauseStatus.Pending.value
    )
    db.add(db_cause)
    db.commit()
    db.refresh(db_cause)
    
    return CauseResponse.from_orm(db_cause)

@router.get("", response_model=list[CauseListResponse])
def list_causes(db: Session = Depends(get_db)):
    """UC-007: Listar causas verificadas."""
    
    causes = db.query(Cause).filter(Cause.status == CauseStatus.Verified.value).all()
    return [CauseListResponse.from_orm(c) for c in causes]

@router.get("/{cause_id}", response_model=CauseResponse)
def get_cause(cause_id: int, db: Session = Depends(get_db)):
    """UC-008: Ver detalle de causa."""
    
    cause = db.query(Cause).filter(Cause.id == cause_id).first()
    
    if not cause:
        raise HTTPException(status_code=404, detail="Cause not found")
    
    return CauseResponse.from_orm(cause)

IMAGE_SIGNATURES = {
    "image/png": b"\x89PNG\r\n\x1a\n",
    "image/jpeg": b"\xff\xd8\xff",
}


def _owned_cause(db: Session, cause_id: int, user: UserResponse) -> Cause:
    cause = db.query(Cause).filter(Cause.id == cause_id).first()
    if not cause:
        raise HTTPException(status_code=404, detail="Cause not found")
    if cause.recipient_id != user.id:
        raise HTTPException(status_code=403, detail="Only the cause owner can do this")
    return cause


@router.post("/{cause_id}/publish", response_model=PublishInstruction)
def publish_cause(
    cause_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """UC-013: Entrega la instrucción de firma de `createCause`; el receptor firma con su wallet (BR-001)."""

    cause = _owned_cause(db, cause_id, current_user)

    if not current_user.wallet_address:
        raise HTTPException(status_code=400, detail="Link a wallet first")  # A6
    if cause.onchain_cause_id is not None:
        raise HTTPException(status_code=409, detail="Cause already published on-chain")  # A2

    return PublishInstruction(
        contract=settings.cause_vault_address,
        params=[cause.title, cause.description, convert_usdt_to_wei(cause.target_amount)],
        message=f"Sign to publish '{cause.title}' on-chain",
    )


@router.post("/{cause_id}/publish/confirm", response_model=CauseResponse)
def confirm_publication(
    cause_id: int,
    req: PublishConfirmRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """UC-013: Enlaza el identificador on-chain leyendo la tx confirmada (solo lectura, BR-001)."""

    cause = _owned_cause(db, cause_id, current_user)

    if cause.onchain_cause_id is not None:
        raise HTTPException(status_code=409, detail="Cause already published on-chain")  # A2

    event = read_cause_created(req.tx_hash)
    if event is None:
        raise HTTPException(status_code=400, detail="Transaction not confirmed or not a cause creation")  # A3

    # BR-003 / A5: la wallet titular, el título y el monto deben coincidir con la causa
    if (
        not current_user.wallet_address
        or event["recipient"].lower() != current_user.wallet_address.lower()
        or event["title"] != cause.title
        or event["target_amount"] != convert_usdt_to_wei(cause.target_amount)
    ):
        raise HTTPException(status_code=400, detail="Transaction does not match this cause and wallet")

    cause.onchain_cause_id = event["cause_id"]
    try:
        db.commit()  # BR-002: identificador único
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="On-chain cause already linked")
    db.refresh(cause)

    # UC-013 paso 6: si ya hay evidencia, se habilita la verificación
    if db.query(Evidence).filter(Evidence.cause_id == cause_id).first():
        enqueue_verification(cause_id)

    return CauseResponse.from_orm(cause)


@router.post("/{cause_id}/upload-image")
async def upload_image(
    cause_id: int,
    image: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """UC-005: Guardar evidencia; UC-006: encolar verificación si la causa ya está publicada."""

    cause = db.query(Cause).filter(Cause.id == cause_id).first()

    if not cause:
        raise HTTPException(status_code=404, detail="Cause not found")

    if cause.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the cause owner can upload")

    if cause.status != CauseStatus.Pending.value:
        raise HTTPException(status_code=400, detail="Can only upload to Pending causes")

    if image.content_type not in IMAGE_SIGNATURES:
        raise HTTPException(status_code=400, detail="Only JPEG and PNG allowed")

    contents = await image.read()
    if len(contents) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Image > 5 MB")
    if not contents.startswith(IMAGE_SIGNATURES[image.content_type]):
        raise HTTPException(status_code=400, detail="File content does not match its type")

    digest = hashlib.sha256(contents).hexdigest()
    evidence = db.query(Evidence).filter(Evidence.cause_id == cause_id).first()
    if evidence is None:
        evidence = Evidence(cause_id=cause_id)
        db.add(evidence)
    evidence.content_type = image.content_type
    evidence.sha256 = digest
    evidence.data = contents
    cause.image_hash = digest
    db.commit()

    if cause.onchain_cause_id is None:
        return {"cause_id": cause_id, "image_hash": digest, "status": "stored; publish the cause on-chain to start verification"}

    enqueue_verification(cause_id)
    return {"cause_id": cause_id, "image_hash": digest, "status": "queued for verification"}


@router.get("/{cause_id}/evidence")
def get_evidence(cause_id: int, db: Session = Depends(get_db)):
    """FR-021: Evidencia consultable; las causas Pending no exponen su imagen."""

    cause = db.query(Cause).filter(Cause.id == cause_id).first()
    evidence = db.query(Evidence).filter(Evidence.cause_id == cause_id).first()
    if not cause or not evidence or cause.status == CauseStatus.Pending.value:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return Response(content=evidence.data, media_type=evidence.content_type,
                    headers={"Cache-Control": "public, max-age=3600"})
