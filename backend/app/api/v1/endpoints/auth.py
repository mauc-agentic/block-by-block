# app/api/v1/endpoints/auth.py
# UC-001, UC-002, UC-003: Auth endpoints

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

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
    UserResponse,
    TokenResponse,
    WalletLinkRequest,
)
from app.utils.helpers import verify_wallet_signature

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
        user_type=user_data.user_type
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
