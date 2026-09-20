# tests/integration/test_auth_integration.py
# Pruebas de endpoints de autenticación (UC-001, UC-002, UC-003)

import pytest
from eth_account import Account
from eth_account.messages import encode_defunct


class TestAuthIntegration:
    """Tests de integración para endpoints de autenticación."""

    def test_uc001_signup_valid(self, test_client):
        """UC-001: Registro exitoso de usuario."""
        payload = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "SecurePassword123",
            "user_type": "donor"
        }

        response = test_client.post("/api/v1/auth/signup", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["username"] == "newuser"
        assert data["user"]["email"] == "newuser@example.com"
        assert data["user"]["user_type"] == "donor"

    def test_uc001_signup_duplicate_email(self, test_client, test_user):
        """UC-001: Rechaza email duplicado."""
        payload = {
            "username": "different",
            "email": test_user.email,  # Ya existe
            "password": "SecurePassword123",
            "user_type": "donor"
        }

        response = test_client.post("/api/v1/auth/signup", json=payload)

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_uc001_signup_duplicate_username(self, test_client, test_user):
        """UC-001: Rechaza username duplicado."""
        payload = {
            "username": test_user.username,  # Ya existe
            "email": "different@example.com",
            "password": "SecurePassword123",
            "user_type": "donor"
        }

        response = test_client.post("/api/v1/auth/signup", json=payload)

        assert response.status_code == 400
        assert "already taken" in response.json()["detail"]

    def test_uc002_login_valid(self, test_client, test_user):
        """UC-002: Login exitoso."""
        payload = {
            "email": test_user.email,
            "password": "SecurePass123"
        }

        response = test_client.post("/api/v1/auth/login", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["id"] == test_user.id

    def test_uc002_login_invalid_email(self, test_client):
        """UC-002: Rechaza email inexistente."""
        payload = {
            "email": "nonexistent@example.com",
            "password": "SomePassword123"
        }

        response = test_client.post("/api/v1/auth/login", json=payload)

        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]

    def test_uc002_login_invalid_password(self, test_client, test_user):
        """UC-002: Rechaza contraseña incorrecta."""
        payload = {
            "email": test_user.email,
            "password": "WrongPassword123"
        }

        response = test_client.post("/api/v1/auth/login", json=payload)

        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]

    def test_uc003_link_wallet_valid(self, test_client, test_user_token):
        """UC-003 BR-001: Vincular wallet con firma válida."""
        acct = Account.create()
        message = "Link wallet to Block by Block"

        msg = encode_defunct(text=message)
        signed_msg = acct.sign_message(msg)

        payload = {
            "wallet_address": acct.address,
            "signature": signed_msg.signature.hex(),
            "message": message
        }

        headers = {"Authorization": f"Bearer {test_user_token}"}
        response = test_client.post(
            "/api/v1/auth/wallet/link",
            json=payload,
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["wallet_address"] == acct.address.lower()

    def test_uc003_link_wallet_invalid_signature(self, test_client, test_user_token):
        """UC-003 BR-001: Rechaza firma inválida."""
        acct = Account.create()
        payload = {
            "wallet_address": acct.address,
            "signature": "0x" + "00" * 65,  # Firma inválida
            "message": "Link wallet to Block by Block"
        }

        headers = {"Authorization": f"Bearer {test_user_token}"}
        response = test_client.post(
            "/api/v1/auth/wallet/link",
            json=payload,
            headers=headers
        )

        assert response.status_code == 400
        assert "Invalid wallet signature" in response.json()["detail"]

    def test_uc003_link_wallet_no_auth(self, test_client):
        """UC-003: Rechaza sin autenticación."""
        acct = Account.create()
        message = "Link wallet to Block by Block"

        msg = encode_defunct(text=message)
        signed_msg = acct.sign_message(msg)

        payload = {
            "wallet_address": acct.address,
            "signature": signed_msg.signature.hex(),
            "message": message
        }

        # Sin header de Authorization
        response = test_client.post("/api/v1/auth/wallet/link", json=payload)

        assert response.status_code == 403  # Forbidden

    def test_uc003_link_wallet_already_linked(self, test_client, test_user_token, db_session):
        """UC-003 BR-002: Rechaza wallet ya vinculada."""
        from app.db.models import User
        from app.core.security import hash_password

        # Crear segundo usuario con wallet vinculada
        acct = Account.create()
        user2 = User(
            username="user2",
            email="user2@example.com",
            hashed_password=hash_password("SecurePass123"),
            user_type="donor",
            wallet_address=acct.address.lower()
        )
        db_session.add(user2)
        db_session.commit()

        # Intentar vincular misma wallet al primer usuario
        message = "Link wallet to Block by Block"
        msg = encode_defunct(text=message)
        signed_msg = acct.sign_message(msg)

        payload = {
            "wallet_address": acct.address,
            "signature": signed_msg.signature.hex(),
            "message": message
        }

        headers = {"Authorization": f"Bearer {test_user_token}"}
        response = test_client.post(
            "/api/v1/auth/wallet/link",
            json=payload,
            headers=headers
        )

        assert response.status_code == 400
        assert "already linked" in response.json()["detail"]
