# database.py
# UC-001, UC-002, UC-003: Models para usuarios, causas y donaciones
# Conexión a Supabase (PostgreSQL) via SQLAlchemy

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core import get_settings

settings = get_settings()

# Crear engine con psycopg2 (PostgreSQL)
engine = create_engine(
    settings.supabase_db_url,
    echo=False,
    pool_pre_ping=True,  # Test connections antes de usarlas
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency para inyectar sesión en endpoints."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
