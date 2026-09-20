# app/api/v1/endpoints/auth.py
# UC-001, UC-002, UC-003: Auth endpoints

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.db import get_db
from app.db.models import User
from app.schemas import (
    UserCreate,
    UserLogin,
    GoogleSignupRequest,
    GoogleLoginRequest,
    UserResponse,
    TokenResponse,
    WalletLinkRequest,
)
from app.utils.helpers import verify_wallet_signature, verify_google_id_token, derive_username

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=TokenResponse)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """UC-001: Registrar cuenta."""
    
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    
    hashed_pw = hash_password(user_data.password)
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_pw,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    access_token = create_access_token(db_user.id)
    return TokenResponse(access_token=access_token, user=UserResponse.from_orm(db_user))

@router.post("/login", response_model=TokenResponse)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    """UC-002: Iniciar sesión."""
    
    user = db.query(User).filter(User.email == creds.email).first()
    
    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(user.id)
    return TokenResponse(access_token=access_token, user=UserResponse.from_orm(user))

@router.post("/google/signup", response_model=TokenResponse)
def google_signup(req: GoogleSignupRequest, db: Session = Depends(get_db)):
    """UC-001 A3: Registro con proveedor externo (Google)."""

    try:
        profile = verify_google_id_token(req.id_token, settings.google_client_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Google token")

    if db.query(User).filter(User.external_id == profile["external_id"]).first():
        raise HTTPException(status_code=400, detail="Account already registered, please log in")
    if db.query(User).filter(User.email == profile["email"]).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # BR-004: garantizar un nombre de usuario derivado único
    base_username = derive_username(profile["name"])
    username = base_username
    suffix = 1
    while db.query(User).filter(User.username == username).first():
        suffix += 1
        username = f"{base_username}{suffix}"

    db_user = User(
        username=username,
        email=profile["email"],
        hashed_password=None,
        auth_provider="google",
        external_id=profile["external_id"],
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    access_token = create_access_token(db_user.id)
    return TokenResponse(access_token=access_token, user=UserResponse.from_orm(db_user))

@router.post("/google/login", response_model=TokenResponse)
def google_login(req: GoogleLoginRequest, db: Session = Depends(get_db)):
    """UC-002 A3: Inicio de sesión con proveedor externo (Google)."""

    try:
        profile = verify_google_id_token(req.id_token, settings.google_client_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Google token")

    user = db.query(User).filter(
        User.external_id == profile["external_id"],
        User.auth_provider == "google",
    ).first()
    if not user:
        # UC-002 A4: identidad externa no registrada
        raise HTTPException(status_code=404, detail="No account found, please sign up")

    access_token = create_access_token(user.id)
    return TokenResponse(access_token=access_token, user=UserResponse.from_orm(user))

@router.post("/wallet/link", response_model=UserResponse)
def link_wallet(
    req: WalletLinkRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """UC-003: Vincular wallet con validación de firma (BR-001)."""

    # BR-001: Validar firma contra la dirección declarada
    if not verify_wallet_signature(req.message, req.signature, req.wallet_address):
        raise HTTPException(status_code=400, detail="Invalid wallet signature")

    # BR-002: Validar que la wallet no esté vinculada a otra cuenta
    if db.query(User).filter(
        User.wallet_address == req.wallet_address.lower(),
        User.id != current_user.id
    ).first():
        raise HTTPException(status_code=400, detail="Wallet already linked to another account")

    user = db.query(User).filter(User.id == current_user.id).first()
    user.wallet_address = req.wallet_address.lower()
    db.commit()
    db.refresh(user)

    return UserResponse.from_orm(user)
