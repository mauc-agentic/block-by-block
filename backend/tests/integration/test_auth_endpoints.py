# tests/integration/test_auth_endpoints.py
# UC-001, UC-002, UC-003: Auth endpoints

import pytest
from fastapi.testclient import TestClient
from eth_account import Account
from eth_account.messages import encode_defunct
from app.main import app
from app.db import get_db

client = TestClient(app)


class TestAuthEndpoints:
    """Tests de integración para endpoints de autenticación."""

    @pytest.fixture
    def test_user(self, db):
        """Crea un usuario de prueba."""
        from app.core.security import hash_password
        from app.db.models import User

        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password=hash_password("SecurePassword123"),
            user_type="donor"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @pytest.fixture
    def auth_token(self, test_user):
        """Obtiene token JWT para el usuario de prueba."""
        from app.core.security import create_access_token
        return create_access_token(test_user.id)

    def test_uc001_signup(self):
        """UC-001: Registrar cuenta."""
        payload = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "SecurePassword123",
            "user_type": "donor"
        }

        response = client.post("/api/v1/auth/signup", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["access_token"]
        assert data["user"]["username"] == "newuser"
        assert data["user"]["email"] == "newuser@example.com"

    def test_uc002_login(self, test_user):
        """UC-002: Iniciar sesión."""
        payload = {
            "email": "test@example.com",
            "password": "SecurePassword123"
        }

        response = client.post("/api/v1/auth/login", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["access_token"]
        assert data["user"]["username"] == "testuser"

    def test_uc003_link_wallet_valid_signature(self, test_user, auth_token):
        """UC-003 BR-001: Vincular wallet con firma válida."""
        # Crear una wallet de prueba
        acct = Account.create()
        message = "Link wallet to Block by Block — 2026-09-20T10:30:00Z"

        # Firmar el mensaje
        msg = encode_defunct(text=message)
        signed_msg = acct.sign_message(msg)

        payload = {
            "wallet_address": acct.address,
            "signature": signed_msg.signature.hex(),
            "message": message
        }

        headers = {"Authorization": f"Bearer {auth_token}"}
        response = client.post(
            "/api/v1/auth/wallet/link",
            json=payload,
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["wallet_address"] == acct.address.lower()

    def test_uc003_link_wallet_invalid_signature(self, test_user, auth_token):
        """UC-003 BR-001: Rechaza firma inválida."""
        acct = Account.create()
        message = "Link wallet to Block by Block — 2026-09-20T10:30:00Z"

        # Crear una firma inválida
        invalid_signature = "0x" + "00" * 65

        payload = {
            "wallet_address": acct.address,
            "signature": invalid_signature,
            "message": message
        }

        headers = {"Authorization": f"Bearer {auth_token}"}
        response = client.post(
            "/api/v1/auth/wallet/link",
            json=payload,
            headers=headers
        )

        assert response.status_code == 400
        assert "Invalid wallet signature" in response.json()["detail"]

    def test_uc003_link_wallet_already_linked(self, test_user, auth_token, db):
        """UC-003 BR-002: Rechaza wallet ya vinculada a otra cuenta."""
        # Crear segunda cuenta con wallet vinculada
        from app.core.security import hash_password
        from app.db.models import User

        acct = Account.create()
        user2 = User(
            username="user2",
            email="user2@example.com",
            hashed_password=hash_password("SecurePassword123"),
            user_type="donor",
            wallet_address=acct.address.lower()
        )
        db.add(user2)
        db.commit()

        # Intentar vincular misma wallet a primer usuario
        message = "Link wallet to Block by Block — 2026-09-20T10:30:00Z"
        msg = encode_defunct(text=message)
        signed_msg = acct.sign_message(msg)

        payload = {
            "wallet_address": acct.address,
            "signature": signed_msg.signature.hex(),
            "message": message
        }

        headers = {"Authorization": f"Bearer {auth_token}"}
        response = client.post(
            "/api/v1/auth/wallet/link",
            json=payload,
            headers=headers
        )

        assert response.status_code == 400
        assert "already linked" in response.json()["detail"]
