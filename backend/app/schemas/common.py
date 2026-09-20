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

class UserCreate(UserBase):
    """UC-001: Registro de usuario. Cualquier cuenta puede donar y publicar causas."""
    password: str = Field(..., min_length=8, max_length=128)

class UserLogin(BaseModel):
    """UC-002: Login de usuario."""
    email: EmailStr
    password: str

class GoogleSignupRequest(BaseModel):
    """UC-001 A3: Registro con proveedor externo (Google)."""
    id_token: str

class GoogleLoginRequest(BaseModel):
    """UC-002 A3: Inicio de sesión con proveedor externo (Google)."""
    id_token: str

class UserResponse(BaseModel):
    """Respuesta de usuario (sin contraseña)."""
    id: int
    username: str
    email: str
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

class DonationItem(BaseModel):
    """UC-008/UC-014: Donación confirmada visible en el detalle de una causa."""
    amount: Decimal
    tx_hash: str
    donor_wallet: Optional[str] = None
    created_at: datetime

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
    verification_reason: Optional[str] = None  # UC-006: motivo del veredicto del agente IA (Verified o Rejected)
    verification_confidence: Optional[Decimal] = None  # UC-006: confianza del veredicto (0.0-1.0)
    created_at: datetime
    recipient_name: Optional[str] = None  # Nombre de usuario del receptor (público)
    image_url: Optional[str] = None  # Ruta relativa a la Base URL de la API; None mientras la causa está Pending
    collected: Decimal = Decimal("0")  # Suma de donaciones confirmadas (UC-014 BR-005)
    donations: list[DonationItem] = []

    class Config:
        from_attributes = True

class CauseListResponse(BaseModel):
    """UC-007: Listado de causas (resumen)."""
    id: int
    title: str
    description: str
    recipient_name: str  # Nombre de usuario del receptor (público)
    image_hash: Optional[str] = None
    image_url: Optional[str] = None  # Ruta relativa a la Base URL de la API (GET /causes/{id}/evidence)
    target_amount: Decimal
    collected: Decimal = Decimal("0")  # Suma de donaciones confirmadas (UC-014 BR-005)
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

class WithdrawInstruction(BaseModel):
    """UC-010: Instrucción de firma para retirar los fondos de una causa (C-009)."""
    status: str = "sign_required"
    contract: str
    function: str = "withdrawFunds"
    params: list
    message: str
    amount: Optional[Decimal] = None  # Saldo a retirar; None si la red no respondió
    to_wallet: str  # Wallet de destino: la vinculada del titular

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
    approve: Optional[dict] = None  # Instrucción previa: approve del token a CauseVault

class DonationConfirmRequest(BaseModel):
    """UC-014: Referencia de la transacción `donate` firmada por el donante."""
    tx_hash: str = Field(..., pattern="^0x[a-fA-F0-9]{64}$")

class DonationRecordResponse(BaseModel):
    """UC-014: Donación registrada en la plataforma."""
    id: int
    cause_id: int
    amount: Decimal
    tx_hash: str
    created_at: datetime
    cause_status: str

# ============================================================================
# DASHBOARD SCHEMAS (UC-011)
# ============================================================================

class DonorDonationItem(BaseModel):
    """UC-011: Donación del propio usuario (historial como donante)."""
    cause_id: int
    cause_title: str
    amount: Decimal
    tx_hash: str
    created_at: datetime

class DashboardCause(CauseResponse):
    """UC-011: Causa propia; añade el saldo que el receptor aún puede retirar del contrato (UC-010)."""
    available_to_withdraw: Optional[Decimal] = None  # None si la causa no está publicada/verificada o la red no responde

class DashboardResponse(BaseModel):
    """UC-011: Resumen del usuario autenticado.

    Cualquier cuenta puede donar y publicar causas (sin rol fijo), así que una sola respuesta combina
    sus causas propias y su historial de donaciones.
    """
    user: UserResponse
    wallet_linked: bool
    causes: list[DashboardCause]  # UC-011 A2: causas propias (recipient_id == user.id)
    total_donated: Decimal = Decimal("0")
    donations: list[DonorDonationItem] = []
