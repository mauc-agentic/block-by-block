# main.py
# FastAPI application — Block by Block Backend
# UC-001..011: Auth, CRUD causas, donaciones, dashboard

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta

from config import get_settings
from database import Base, engine, get_db
from models import User, Cause, CauseStatus
from schemas import (
    UserCreate, UserLogin, TokenResponse, UserResponse, 
    WalletLinkRequest, CauseCreate, CauseResponse, CauseListResponse
)
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, pwd_context
)

settings = get_settings()

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Block by Block API",
    description="Plataforma de donaciones peer-to-peer descentralizada",
    version="0.1.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "block-by-block-backend"}

# ============================================================================
# UC-001: REGISTRAR CUENTA
# ============================================================================

@app.post("/auth/signup", response_model=TokenResponse)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    UC-001: Registrar cuenta como donante o receptor.
    
    Business Rules:
    - BR-001: Rol único (donante o receptor, no cambia)
    - BR-002: Email y username deben ser únicos
    - BR-003: Contraseña mínima 8 caracteres, nunca se devuelve
    """
    
    # Validar que no exista
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Crear usuario
    hashed_pw = hash_password(user_data.password)
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_pw,
        user_type=user_data.user_type
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Crear token
    access_token = create_access_token(db_user.id)
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.from_orm(db_user)
    )

# ============================================================================
# UC-002: INICIAR SESIÓN
# ============================================================================

@app.post("/auth/login", response_model=TokenResponse)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    """
    UC-002: Iniciar sesión.
    
    Business Rules:
    - BR-001: Mensaje genérico si credenciales invalidas (no revelar si existe)
    - BR-002: Sesión expira a las 24h
    """
    
    user = db.query(User).filter(User.email == creds.email).first()
    
    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    access_token = create_access_token(user.id)
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.from_orm(user)
    )

# ============================================================================
# UC-003: VINCULAR WALLET
# ============================================================================

@app.post("/wallet/link", response_model=UserResponse)
def link_wallet(
    req: WalletLinkRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    UC-003: Vincular wallet al usuario.
    
    TODO: Validar la firma del mensaje con web3.py
    
    Business Rules:
    - BR-001: Prueba de propiedad mediante firma
    - BR-002: Una wallet por cuenta
    - BR-003: Mensaje único por intento (implementado con timestamp del mensaje)
    """
    
    # TODO: Validar firma
    # from web3 import Web3
    # address = Web3.eth.Account.recover_message(message, signature=signature)
    # assert address.lower() == req.wallet_address.lower()
    
    # Verificar que la wallet no esté en uso
    if db.query(User).filter(
        User.wallet_address == req.wallet_address.lower(),
        User.id != current_user.id
    ).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Wallet already linked to another account"
        )
    
    # Vincular
    user = db.query(User).filter(User.id == current_user.id).first()
    user.wallet_address = req.wallet_address.lower()
    db.commit()
    db.refresh(user)
    
    return UserResponse.from_orm(user)

# ============================================================================
# UC-007, UC-008: LISTAR Y VER DETALLE DE CAUSAS
# ============================================================================

@app.get("/causes", response_model=list[CauseListResponse])
def list_verified_causes(db: Session = Depends(get_db)):
    """
    UC-007: Explorar causas verificadas.
    
    Filtra solo causas en estado Verified.
    NFR-002: Debe responder en menos de 2s con hasta 500 causas.
    """
    causes = db.query(Cause).filter(
        Cause.status == CauseStatus.Verified.value
    ).all()
    
    return [CauseListResponse.from_orm(c) for c in causes]

@app.get("/causes/{cause_id}", response_model=CauseResponse)
def get_cause(cause_id: int, db: Session = Depends(get_db)):
    """
    UC-008: Ver detalle de causa.
    
    NFR-011: Incluye historial de donaciones (auditable).
    """
    cause = db.query(Cause).filter(Cause.id == cause_id).first()
    
    if not cause:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cause not found"
        )
    
    return CauseResponse.from_orm(cause)

# ============================================================================
# UC-004: CREAR CAUSA
# ============================================================================

@app.post("/causes", response_model=CauseResponse)
def create_cause(
    cause_data: CauseCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    UC-004: Crear causa.
    
    Solo receptores pueden crear causas.
    La causa nace en estado Pending.
    
    Business Rules:
    - BR-001: Solo receptores
    - BR-002: Monto positivo
    - BR-003: Estado inicial Pending
    """
    
    if current_user.user_type != "recipient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only recipients can create causes"
        )
    
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

# ============================================================================
# UC-011: VER DASHBOARD
# ============================================================================

@app.get("/user/{user_id}", response_model=UserResponse)
def get_user_profile(
    user_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    UC-011: Ver perfil del usuario (base del dashboard).
    
    BR-001: Un usuario solo ve su propio perfil
    """
    
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's profile"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.from_orm(user)

# ============================================================================
# STARTUP
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port)
