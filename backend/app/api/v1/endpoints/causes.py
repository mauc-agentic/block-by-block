# app/api/v1/endpoints/causes.py
# UC-004, UC-007, UC-008, UC-011: Causes endpoints

from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from sqlalchemy.orm import Session
import hashlib

from app.core import get_settings
from app.core.security import get_current_user
from app.db import get_db
from app.db.models import Cause, CauseStatus
from app.schemas import (
    UserResponse,
    CauseCreate,
    CauseResponse,
    CauseListResponse,
)

router = APIRouter(prefix="/causes", tags=["causes"])
settings = get_settings()

@router.post("", response_model=CauseResponse)
def create_cause(
    cause_data: CauseCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """UC-004: Crear causa."""
    
    if current_user.user_type != "recipient":
        raise HTTPException(status_code=403, detail="Only recipients can create causes")
    
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

@router.post("/{cause_id}/upload-image")
async def upload_image(
    cause_id: int,
    image: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """UC-005: Subir evidencia de causa."""
    
    cause = db.query(Cause).filter(Cause.id == cause_id).first()
    
    if not cause:
        raise HTTPException(status_code=404, detail="Cause not found")
    
    if cause.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the cause owner can upload")
    
    if cause.status != CauseStatus.Pending.value:
        raise HTTPException(status_code=400, detail="Can only upload to Pending causes")
    
    if image.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(status_code=400, detail="Only JPEG and PNG allowed")
    
    contents = await image.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image > 5 MB")
    
    image_hash = hashlib.sha256(contents).hexdigest()[:10]
    
    cause.image_hash = image_hash
    db.commit()
    db.refresh(cause)
    
    return {
        "cause_id": cause_id,
        "image_hash": image_hash,
        "status": "queued for verification"
    }
