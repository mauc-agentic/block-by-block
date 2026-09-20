# tests/conftest.py
# Configuración de pytest para tests de integración

import pytest
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

# Usar SQLite para tests (en memoria)
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def test_engine():
    """Crea engine de prueba con SQLite (scope function para limpiar entre tests)."""
    engine = create_engine(
        SQLALCHEMY_TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )
    return engine

@pytest.fixture(scope="function")
def setup_db(test_engine):
    """Crea todas las tablas para cada test."""
    from app.db import Base
    # Importar modelos para registrarlos en Base.metadata
    from app.db.models import User, Cause, Donation, Verification
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session(test_engine, setup_db):
    """Crea una sesión de BD para cada test."""
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine,
    )
    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.rollback()
        session.close()

@pytest.fixture
def test_client(db_session):
    """FastAPI test client con DB inyectada."""
    from app.main import app
    from app.db import get_db

    def override_get_db():
        return db_session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()

@pytest.fixture
def test_user(db_session):
    """Crea un usuario de prueba (receptor)."""
    from app.db.models import User
    from app.core.security import hash_password

    user = User(
        username="testrecipient",
        email="recipient@example.com",
        hashed_password=hash_password("SecurePass123"),
        user_type="recipient"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_donor(db_session):
    """Crea un donante de prueba."""
    from app.db.models import User
    from app.core.security import hash_password

    user = User(
        username="testdonor",
        email="donor@example.com",
        hashed_password=hash_password("SecurePass123"),
        user_type="donor"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_user_token(test_user):
    """Obtiene JWT token para usuario de prueba."""
    from app.core.security import create_access_token
    return create_access_token(test_user.id)

@pytest.fixture
def test_donor_token(test_donor):
    """Obtiene JWT token para donante de prueba."""
    from app.core.security import create_access_token
    return create_access_token(test_donor.id)

@pytest.fixture
def test_cause(db_session, test_user):
    """Crea una causa de prueba."""
    from app.db.models import Cause, CauseStatus
    from decimal import Decimal

    cause = Cause(
        recipient_id=test_user.id,
        title="Test Cause",
        description="Test cause description for integration testing",
        target_amount=Decimal("100.00"),
        status=CauseStatus.Pending.value
    )
    db_session.add(cause)
    db_session.commit()
    db_session.refresh(cause)
    return cause
