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
        }

        response = real_test_client.post("/api/v1/auth/signup", json=payload)
        assert response.status_code == 200

        # Verificar que está en Supabase
        user = real_db_session.query(User).filter(User.email == test_email).first()
        assert user is not None
        assert user.username == "e2e_testuser_signup"

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

    def test_uc001_a3_google_signup_creates_user(self, real_test_client, real_db_session, monkeypatch):
        """UC-001 A3, BR-004: registro con Google crea cuenta y deriva username único."""
        import uuid
        from app.db.models import User

        tag = uuid.uuid4().hex[:8]
        external_id = f"google-sub-{tag}"
        email = f"e2e_google_signup_{tag}@block-by-block.com"

        monkeypatch.setattr(
            "app.api.v1.endpoints.auth.verify_google_id_token",
            lambda token, client_id: {
                "external_id": external_id, "email": email, "name": "Ada Lovelace",
            },
        )

        response = real_test_client.post(
            "/api/v1/auth/google/signup",
            json={"id_token": "fake-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["auth_provider"] == "google"
        assert data["user"]["username"].startswith("adalovelace")

        real_db_session.query(User).filter(User.external_id == external_id).delete()
        real_db_session.commit()

    def test_uc001_a3_google_signup_rejects_duplicate_identity(self, real_test_client, real_db_session, monkeypatch):
        """UC-001 A3, BR-002: no se puede registrar dos veces la misma identidad externa."""
        import uuid
        from app.db.models import User

        tag = uuid.uuid4().hex[:8]
        external_id = f"google-sub-dup-{tag}"
        email = f"e2e_google_dup_{tag}@block-by-block.com"

        user = User(
            username=f"e2e_google_dup_{tag}", email=email, hashed_password=None,
            auth_provider="google", external_id=external_id,
        )
        real_db_session.add(user)
        real_db_session.commit()

        monkeypatch.setattr(
            "app.api.v1.endpoints.auth.verify_google_id_token",
            lambda token, client_id: {
                "external_id": external_id, "email": email, "name": "Dup User",
            },
        )

        response = real_test_client.post(
            "/api/v1/auth/google/signup",
            json={"id_token": "fake-token"},
        )
        assert response.status_code == 400

        real_db_session.query(User).filter(User.external_id == external_id).delete()
        real_db_session.commit()

    def test_uc002_a3_google_login_existing_user(self, real_test_client, real_db_session, monkeypatch):
        """UC-002 A3: login con Google para una cuenta ya registrada con ese proveedor."""
        import uuid
        from app.db.models import User

        tag = uuid.uuid4().hex[:8]
        external_id = f"google-sub-login-{tag}"
        email = f"e2e_google_login_{tag}@block-by-block.com"

        user = User(
            username=f"e2e_google_login_{tag}", email=email, hashed_password=None,
            auth_provider="google", external_id=external_id,
        )
        real_db_session.add(user)
        real_db_session.commit()

        monkeypatch.setattr(
            "app.api.v1.endpoints.auth.verify_google_id_token",
            lambda token, client_id: {
                "external_id": external_id, "email": email, "name": "Login User",
            },
        )

        response = real_test_client.post("/api/v1/auth/google/login", json={"id_token": "fake-token"})
        assert response.status_code == 200
        assert "access_token" in response.json()

        real_db_session.query(User).filter(User.external_id == external_id).delete()
        real_db_session.commit()

    def test_uc002_a4_google_login_unregistered_identity(self, real_test_client, monkeypatch):
        """UC-002 A4: login con Google sin cuenta asociada devuelve 404."""
        monkeypatch.setattr(
            "app.api.v1.endpoints.auth.verify_google_id_token",
            lambda token, client_id: {
                "external_id": "google-sub-does-not-exist", "email": "nobody@block-by-block.com",
                "name": "Nobody",
            },
        )

        response = real_test_client.post("/api/v1/auth/google/login", json={"id_token": "fake-token"})
        assert response.status_code == 404

    def test_list_causes_from_supabase(self, real_test_client, real_db_session):
        """UC-007: Lista causas verificadas desde Supabase."""
        response = real_test_client.get("/api/v1/causes")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Puede haber 0 o más causas verificadas

    def test_uc004_uc009_authenticated_flow(self, real_test_client, real_db_session):
        """UC-004, UC-008, UC-009 BR-001: endpoints autenticados con sesión real."""
        import uuid
        from app.db.models import User, Cause

        tag = uuid.uuid4().hex[:8]
        signup = real_test_client.post("/api/v1/auth/signup", json={
            "username": f"e2e_rec_{tag}", "email": f"e2e_rec_{tag}@block-by-block.com",
            "password": "Pass123!",
        })
        assert signup.status_code == 200
        headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}
        user_id = signup.json()["user"]["id"]

        try:
            assert real_test_client.post("/api/v1/causes", json={
                "title": "Causa sin sesión", "description": "descripción de prueba sin autenticación", "target_amount": 10}).status_code in (401, 403)

            body = {"title": "Causa e2e", "description": "descripción de prueba para flujo autenticado", "target_amount": 10}
            # UC-004 A2: sin wallet vinculada no se puede crear la causa
            assert real_test_client.post("/api/v1/causes", headers=headers, json=body).status_code == 400
            from eth_account import Account
            from eth_account.messages import encode_defunct
            wallet = Account.create()
            sig = wallet.sign_message(encode_defunct(text=f"Link {tag}")).signature.hex()
            assert real_test_client.post("/api/v1/auth/wallet/link", headers=headers, json={
                "wallet_address": wallet.address, "signature": "0x" + sig.removeprefix("0x"),
                "message": f"Link {tag}"}).status_code == 200

            created = real_test_client.post("/api/v1/causes", headers=headers, json=body)
            assert created.status_code == 200
            cause_id = created.json()["id"]
            assert created.json()["status"] == "Pending"

            assert real_test_client.get(f"/api/v1/causes/{cause_id}").status_code == 200

            donate = real_test_client.post(
                f"/api/v1/causes/{cause_id}/donate", headers=headers, json={"amount": 5})
            assert donate.status_code == 400
        finally:
            real_db_session.rollback()
            real_db_session.query(Cause).filter(Cause.recipient_id == user_id).delete()
            real_db_session.query(User).filter(User.id == user_id).delete()
            real_db_session.commit()


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
