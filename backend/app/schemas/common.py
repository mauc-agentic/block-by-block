# schemas.py
# Pydantic models para validar y serializar solicitudes/respuestas
# Trazables a UC-001..011

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal

# ============================================================================
# AUTH SCHEMAS (UC-001, UC-002, UC-003)
# ============================================================================

class UserBase(BaseModel):
    """Base para datos de usuario."""
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    user_type: str = Field(..., pattern="^(donor|recipient)$")

class UserCreate(UserBase):
    """UC-001: Registro de usuario."""
    password: str = Field(..., min_length=8, max_length=128)

class UserLogin(BaseModel):
    """UC-002: Login de usuario."""
    email: EmailStr
    password: str

class GoogleSignupRequest(BaseModel):
    """UC-001 A3: Registro con proveedor externo (Google)."""
    id_token: str
    user_type: str = Field(..., pattern="^(donor|recipient)$")

class GoogleLoginRequest(BaseModel):
    """UC-002 A3: Inicio de sesión con proveedor externo (Google)."""
    id_token: str

class UserResponse(BaseModel):
    """Respuesta de usuario (sin contraseña)."""
    id: int
    username: str
    email: str
    user_type: str
    auth_provider: str = "local"
    wallet_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    """Respuesta con token JWT."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class WalletLinkRequest(BaseModel):
    """UC-003: Vincular wallet con firma."""
    wallet_address: str = Field(..., pattern="^0x[a-fA-F0-9]{40}$")
    signature: str = Field(..., pattern="^0x[a-fA-F0-9]{130}$")
    message: str

# ============================================================================
# CAUSE SCHEMAS (UC-004, UC-005, UC-007, UC-008, UC-009, UC-010, UC-011)
# ============================================================================

class CauseCreate(BaseModel):
    """UC-004: Crear causa."""
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=20, max_length=2000)
    target_amount: Decimal = Field(..., gt=0, decimal_places=6, max_digits=18)

class CauseResponse(BaseModel):
    """UC-007, UC-008, UC-011: Detalle de causa."""
    id: int
    recipient_id: int
    onchain_cause_id: Optional[int] = None
    title: str
    description: str
    image_hash: Optional[str] = None
    target_amount: Decimal
    status: str
    verification_hash: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class CauseListResponse(BaseModel):
    """UC-007: Listado de causas (resumen)."""
    id: int
    title: str
    image_hash: Optional[str] = None
    target_amount: Decimal
    collected: Decimal = Decimal("0")  # Se calcula del contrato
    status: str
    
    class Config:
        from_attributes = True

class PublishInstruction(BaseModel):
    """UC-013: Instrucción de firma para publicar la causa en el contrato (C-009)."""
    status: str = "sign_required"
    contract: str
    function: str = "createCause"
    params: list
    message: str

class PublishConfirmRequest(BaseModel):
    """UC-013: Referencia de la transacción `createCause` firmada por el receptor."""
    tx_hash: str = Field(..., pattern="^0x[a-fA-F0-9]{64}$")

# ============================================================================
# DONATION SCHEMAS (UC-009, UC-011)
# ============================================================================

class DonateRequest(BaseModel):
    """UC-009: Solicitud de donación."""
    amount: Decimal = Field(..., gt=0, decimal_places=6, max_digits=18)

class DonationResponse(BaseModel):
    """UC-009: Confirmación de donación."""
    status: str = "sign_required"
    contract: str
    function: str = "donate"
    params: list
    message: str

# ============================================================================
# DASHBOARD SCHEMAS (UC-011)
# ============================================================================

class DashboardDonorResponse(BaseModel):
    """UC-011: Dashboard del donante."""
    user: UserResponse
    total_donated: Decimal
    causes_supported: int
    donations: list  # [{"cause_id": 1, "title": "...", "amount": ..., "date": ...}]

class DashboardRecipientResponse(BaseModel):
    """UC-011: Dashboard del receptor."""
    user: UserResponse
    causes: list  # [{"id": 1, "title": "...", "target": ..., "collected": ..., "status": "..."}]
