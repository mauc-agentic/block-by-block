# security.py
# Lógica de autenticación y JWT (UC-001, UC-002, UC-003)

from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import get_settings

settings = get_settings()

# Contexto de hash de contraseñas (argon2 es más moderno y seguro que bcrypt)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Esquema de seguridad HTTP Bearer
security = HTTPBearer()

def hash_password(password: str) -> str:
    """Hash una contraseña con bcrypt."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña contra su hash."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user_id: int, expires_delta: timedelta = None) -> str:
    """Crea un JWT con exp de 24h."""
    if expires_delta is None:
        expires_delta = timedelta(hours=settings.access_token_expire_hours)

    expire = datetime.utcnow() + expires_delta
    to_encode = {"sub": str(user_id), "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def verify_token(token: str, db: Session):
    """Verifica un JWT y devuelve el usuario."""
    from app.db.models import User
    from app.schemas import UserResponse

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    return UserResponse.from_orm(user)

def _db_session():
    # Import diferido: app.db.session importa app.core, que importa este módulo.
    from app.db import get_db
    yield from get_db()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(_db_session),
):
    """Dependency para extraer el usuario actual del token."""
    return verify_token(credentials.credentials, db)
