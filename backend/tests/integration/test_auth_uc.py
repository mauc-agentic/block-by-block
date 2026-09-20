# UC-001, UC-002, UC-003, UC-004: flujos alternativos y reglas de auth y creación, contra Supabase real

import uuid
from datetime import timedelta

import pytest
from eth_account import Account
from eth_account.messages import encode_defunct
from jose import jwt

from app.core import get_settings
from app.core.security import create_access_token
from app.db.models import Cause, User
from tests.integration.test_supabase_integration import (  # noqa: F401  (fixtures compartidas)
    real_db_session,
    real_engine,
    real_test_client,
)

PASSWORD = "Pass123!"


@pytest.fixture(scope="module", autouse=True)
def _tables(real_engine):
    from app.db import Base
    Base.metadata.create_all(bind=real_engine)


@pytest.fixture
def accounts(real_test_client, real_db_session):
    created = []

    def signup(tag=None, **overrides):
        tag = tag or uuid.uuid4().hex[:8]
        payload = {"username": f"e2e_auth_{tag}", "email": f"e2e_auth_{tag}@block-by-block.com", "password": PASSWORD, **overrides}
        response = real_test_client.post("/api/v1/auth/signup", json=payload)
        if response.status_code == 200:
            created.append(response.json()["user"]["id"])
        return response, payload

    yield signup

    real_db_session.rollback()
    real_db_session.query(Cause).filter(Cause.recipient_id.in_(created)).delete(synchronize_session=False)
    real_db_session.query(User).filter(User.id.in_(created)).delete(synchronize_session=False)
    real_db_session.commit()


def sign(wallet, message):
    return "0x" + wallet.sign_message(encode_defunct(text=message)).signature.hex().removeprefix("0x")


def link_body(wallet, message=None):
    """Cuerpo de vinculación con un mensaje único por intento (UC-003 BR-003)."""
    message = message or f"Link {uuid.uuid4().hex}"
    return {"wallet_address": wallet.address, "signature": sign(wallet, message), "message": message}


class TestRegisterUC001:
    def test_uc001_a1_br002_duplicate_email_or_username_is_rejected(self, real_test_client, accounts):
        first, payload = accounts()
        assert first.status_code == 200
        same_email = real_test_client.post("/api/v1/auth/signup", json={**payload, "username": payload["username"] + "_2"})
        same_username = real_test_client.post("/api/v1/auth/signup", json={**payload, "email": "otro_" + payload["email"]})
        assert same_email.status_code == 400 and same_username.status_code == 400

    @pytest.mark.parametrize("overrides", [{"password": "corta"}, {"email": "no-es-un-correo"}, {"username": "ab"}])
    def test_uc001_a2_br003_invalid_data_is_rejected(self, accounts, overrides):
        response, _ = accounts(**overrides)
        assert response.status_code == 422


class TestLoginUC002:
    def test_uc002_a1_br001_wrong_password_and_unknown_email_get_the_same_generic_message(self, real_test_client, accounts):
        _, payload = accounts()
        wrong_password = real_test_client.post("/api/v1/auth/login", json={"email": payload["email"], "password": "OtraPass123!"})
        unknown_email = real_test_client.post("/api/v1/auth/login", json={"email": "nadie_" + payload["email"], "password": PASSWORD})
        assert wrong_password.status_code == unknown_email.status_code == 401
        assert wrong_password.json()["detail"] == unknown_email.json()["detail"]

    def test_uc002_br002_session_lasts_24_hours(self, accounts):
        response, _ = accounts()
        claims = jwt.decode(response.json()["access_token"], get_settings().secret_key, algorithms=["HS256"])
        remaining = claims["exp"] - claims["iat"] if "iat" in claims else None
        import time
        assert 23 * 3600 < claims["exp"] - time.time() <= 24 * 3600 + 5, remaining

    def test_uc002_a2_expired_session_is_rejected(self, real_test_client, accounts):
        response, _ = accounts()
        expired = create_access_token(response.json()["user"]["id"], timedelta(seconds=-5))
        assert real_test_client.get("/api/v1/users/me/dashboard", headers={"Authorization": f"Bearer {expired}"}).status_code == 401


class TestLinkWalletUC003:
    def _headers(self, response):
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def test_uc003_a1_endpoint_rejects_a_signature_from_another_wallet(self, real_test_client, accounts):
        response, _ = accounts()
        declared, signer = Account.create(), Account.create()
        body = link_body(signer)
        r = real_test_client.post("/api/v1/auth/wallet/link", headers=self._headers(response), json={**body, "wallet_address": declared.address})
        assert r.status_code == 400 and r.json()["detail"] == "Invalid wallet signature"

    def test_uc003_a2_br002_wallet_already_linked_to_another_account_is_rejected(self, real_test_client, accounts):
        first, _ = accounts()
        second, _ = accounts()
        wallet = Account.create()
        assert real_test_client.post("/api/v1/auth/wallet/link", headers=self._headers(first), json=link_body(wallet)).status_code == 200
        r = real_test_client.post("/api/v1/auth/wallet/link", headers=self._headers(second), json=link_body(wallet))
        assert r.status_code == 400 and "already linked" in r.json()["detail"]

    def test_uc003_br003_a_message_can_only_be_used_once_even_by_another_account(self, real_test_client, accounts):
        first, _ = accounts()
        second, _ = accounts()
        wallet = Account.create()
        body = link_body(wallet)
        assert real_test_client.post("/api/v1/auth/wallet/link", headers=self._headers(first), json=body).status_code == 200
        replay_same_account = real_test_client.post("/api/v1/auth/wallet/link", headers=self._headers(first), json=body)
        replay_other_account = real_test_client.post("/api/v1/auth/wallet/link", headers=self._headers(second), json=body)
        assert replay_same_account.status_code == replay_other_account.status_code == 400
        assert replay_same_account.json()["detail"] == replay_other_account.json()["detail"] == "Message already used"

    def test_uc003_br003_a_message_is_consumed_even_when_the_link_is_rejected_afterwards(self, real_test_client, accounts):
        owner, _ = accounts()
        thief, _ = accounts()
        wallet = Account.create()
        assert real_test_client.post("/api/v1/auth/wallet/link", headers=self._headers(owner), json=link_body(wallet)).status_code == 200
        stolen = link_body(wallet)  # firma válida de la wallet, pero la wallet ya pertenece a otra cuenta
        assert real_test_client.post("/api/v1/auth/wallet/link", headers=self._headers(thief), json=stolen).status_code == 400
        assert real_test_client.post("/api/v1/auth/wallet/link", headers=self._headers(thief), json=stolen).json()["detail"] == "Message already used"

    def test_uc003_a5_br004_wallet_cannot_change_while_the_account_has_published_causes(self, real_test_client, real_db_session, accounts):
        response, _ = accounts()
        headers = self._headers(response)
        user_id = response.json()["user"]["id"]
        old_wallet, new_wallet = Account.create(), Account.create()
        assert real_test_client.post("/api/v1/auth/wallet/link", headers=headers, json=link_body(old_wallet)).status_code == 200

        # sin causas publicadas la wallet sí puede cambiar
        assert real_test_client.post("/api/v1/auth/wallet/link", headers=headers, json=link_body(new_wallet)).status_code == 200

        cause = real_test_client.post("/api/v1/causes", headers=headers, json={
            "title": "Causa publicada", "description": "Descripción suficientemente larga de la causa", "target_amount": 10}).json()
        real_db_session.query(Cause).filter(Cause.id == cause["id"]).update({"onchain_cause_id": 200_000 + uuid.uuid4().int % 90_000})
        real_db_session.commit()

        r = real_test_client.post("/api/v1/auth/wallet/link", headers=headers, json=link_body(old_wallet))
        assert r.status_code == 400 and r.json()["detail"] == "Wallet cannot change while you have published causes"
        # volver a vincular la misma wallet no es un cambio
        assert real_test_client.post("/api/v1/auth/wallet/link", headers=headers, json=link_body(new_wallet)).status_code == 200
        me = real_db_session.query(User).filter(User.id == user_id).one()
        real_db_session.refresh(me)
        assert me.wallet_address == new_wallet.address.lower()


class TestCreateCauseUC004:
    def _linked_user(self, real_test_client, accounts):
        response, _ = accounts()
        headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        assert real_test_client.post("/api/v1/auth/wallet/link", headers=headers, json=link_body(Account.create())).status_code == 200
        return headers

    @pytest.mark.parametrize("body", [
        {"title": "abc", "description": "d" * 30, "target_amount": 10},            # título muy corto
        {"title": "Título válido", "description": "corta", "target_amount": 10},   # descripción muy corta
        {"title": "Título válido", "description": "d" * 30, "target_amount": 0},   # BR-002: monto no positivo
        {"title": "Título válido", "description": "d" * 30, "target_amount": -5},
    ])
    def test_uc004_a1_br002_invalid_cause_data_is_rejected(self, real_test_client, accounts, body):
        headers = self._linked_user(real_test_client, accounts)
        assert real_test_client.post("/api/v1/causes", headers=headers, json=body).status_code == 422


class TestEvidenceOwnershipUC005:
    PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32

    def test_uc005_a2_br001_another_authenticated_user_cannot_upload_or_verify_someone_elses_cause(self, real_test_client, accounts):
        def linked(response):
            headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
            assert real_test_client.post("/api/v1/auth/wallet/link", headers=headers, json=link_body(Account.create())).status_code == 200
            return headers

        owner, intruder = linked(accounts()[0]), linked(accounts()[0])
        cause = real_test_client.post("/api/v1/causes", headers=owner, json={
            "title": "Causa del propietario", "description": "Descripción suficientemente larga de la causa", "target_amount": 10}).json()
        upload = real_test_client.post(f"/api/v1/causes/{cause['id']}/upload-image", headers=intruder,
                                       files={"image": ("a.png", self.PNG, "image/png")})
        assert upload.status_code == 403
        assert real_test_client.post(f"/api/v1/causes/{cause['id']}/publish", headers=intruder).status_code == 403
