# tests/integration/test_supabase_integration.py
# Tests contra Supabase PostgreSQL REAL (no mock)

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from app.core.config import get_settings

# Usar BD real de Supabase
settings = get_settings()

@pytest.fixture(scope="session")
def real_engine():
    """Conecta a Supabase PostgreSQL real."""
    engine = create_engine(
        settings.supabase_db_url,
        echo=False,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )
    yield engine

@pytest.fixture
def real_db_session(real_engine):
    """Sesión con BD real de Supabase."""
    RealSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=real_engine,
    )
    session = RealSessionLocal()

    try:
        yield session
    finally:
        session.rollback()
        session.close()

@pytest.fixture
def real_test_client(real_db_session):
    """Cliente FastAPI contra BD real."""
    from app.main import app
    from app.db import get_db

    def override_get_db():
        try:
            yield real_db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


class TestSupabaseIntegration:
    """Tests contra Supabase PostgreSQL real."""

    def test_db_connection(self, real_engine):
        """Verifica que se puede conectar a Supabase."""
        connection = real_engine.connect()
        result = connection.execute(text("SELECT 1"))
        assert result.fetchone()[0] == 1
        connection.close()

    def test_signup_persists_to_supabase(self, real_test_client, real_db_session):
        """UC-001: Verifica que signup guarda datos en Supabase."""
        from app.db.models import User
        from sqlalchemy import delete

        # Limpiar datos de prueba anteriores
        test_email = "e2e_test_signup@block-by-block.com"
        real_db_session.execute(delete(User).where(User.email == test_email))
        real_db_session.commit()

        # Hacer signup
        payload = {
            "username": "e2e_testuser_signup",
            "email": test_email,
            "password": "Pass123!",  # ≤72 bytes
            "user_type": "donor"
        }

        response = real_test_client.post("/api/v1/auth/signup", json=payload)
        assert response.status_code == 200

        # Verificar que está en Supabase
        user = real_db_session.query(User).filter(User.email == test_email).first()
        assert user is not None
        assert user.username == "e2e_testuser_signup"
        assert user.user_type == "donor"

        # Cleanup
        real_db_session.delete(user)
        real_db_session.commit()

    def test_login_queries_supabase(self, real_test_client, real_db_session):
        """UC-002: Verifica que login consulta Supabase."""
        from app.db.models import User
        from app.core.security import hash_password
        from sqlalchemy import delete

        # Crear usuario de prueba en Supabase
        test_email = "e2e_test_login@block-by-block.com"
        real_db_session.execute(delete(User).where(User.email == test_email))
        real_db_session.commit()

        user = User(
            username="e2e_testuser_login",
            email=test_email,
            hashed_password=hash_password("Pass123!"),
            user_type="donor"
        )
        real_db_session.add(user)
        real_db_session.commit()

        # Intentar login
        payload = {
            "email": test_email,
            "password": "Pass123!"
        }

        response = real_test_client.post("/api/v1/auth/login", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

        # Cleanup
        real_db_session.delete(user)
        real_db_session.commit()

    def test_list_causes_from_supabase(self, real_test_client, real_db_session):
        """UC-007: Lista causas verificadas desde Supabase."""
        response = real_test_client.get("/api/v1/causes")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Puede haber 0 o más causas verificadas


class TestHSKIntegration:
    """Tests contra HSK testnet (si credenciales están configuradas)."""

    def test_hsk_rpc_connection(self):
        """Verifica que se puede conectar a HSK RPC."""
        from web3 import Web3

        w3 = Web3(Web3.HTTPProvider(settings.hsk_rpc_url))
        is_connected = w3.is_connected()

        if is_connected:
            block = w3.eth.block_number
            assert block > 0
            print(f"✓ HSK testnet connected, latest block: {block}")
        else:
            pytest.skip("HSK testnet not reachable")

    def test_agent_address_is_valid(self):
        """Verifica que AGENT_ADDRESS es válida."""
        from web3 import Web3

        agent_addr = settings.agent_address

        # Si es placeholder, skip
        if agent_addr in ["0x", "0xYourAgentAddress"]:
            pytest.skip("AGENT_ADDRESS is placeholder, skipping HSK tests")

        # Verificar formato
        assert Web3.is_address(agent_addr)
        assert agent_addr.startswith("0x")
        print(f"✓ AGENT_ADDRESS is valid: {agent_addr}")

    def test_agent_private_key_format(self):
        """Verifica que AGENT_PRIVATE_KEY tiene formato válido."""
        agent_pk = settings.agent_private_key

        # Si es placeholder, skip
        if agent_pk in ["0x", "0xYourAgentPrivateKey"]:
            pytest.skip("AGENT_PRIVATE_KEY is placeholder, skipping")

        # Verificar formato
        assert agent_pk.startswith("0x")
        assert len(agent_pk) == 66  # 0x + 64 hex chars
        print(f"✓ AGENT_PRIVATE_KEY format is valid")

    @pytest.mark.skip(reason="Requires valid HSK credentials")
    def test_verifycause_tx_signing(self):
        """UC-006: Verifica que se puede firmar transacciones on-chain."""
        from app.services.agent import sign_verification_tx
        from sqlalchemy.orm import Session

        # Placeholder test - requiere AGENT_PRIVATE_KEY válida
        # En producción, probaría:
        # tx_hash = sign_verification_tx(cause_id=1, verified=True, verification_hash="Qm...", db=db)
        # assert tx_hash is not None
        pass
