# UC-009, UC-014, UC-011: donaciones y dashboards contra Supabase real (cadena simulada)

import uuid
from decimal import Decimal

import pytest
from eth_account import Account
from eth_account.messages import encode_defunct

import app.api.v1.endpoints.donations as donations_ep
import app.api.v1.endpoints.users as users_ep
from app.db import Base
from app.db.models import Cause, Donation, Evidence, User, Verification
from tests.integration.test_supabase_integration import (  # noqa: F401  (fixtures compartidas)
    real_db_session,
    real_engine,
    real_test_client,
)

TOKEN = "0x00000000000000000000000000000000000000AA"


@pytest.fixture(scope="module", autouse=True)
def _tables(real_engine):
    Base.metadata.create_all(bind=real_engine)


class Person:
    def __init__(self, id, headers, wallet):
        self.id, self.headers, self.wallet = id, headers, wallet


@pytest.fixture
def make_user(real_test_client, real_db_session):
    created = []

    def factory(with_wallet=True):
        tag = uuid.uuid4().hex[:8]
        signup = real_test_client.post("/api/v1/auth/signup", json={
            "username": f"e2e_d_{tag}", "email": f"e2e_d_{tag}@block-by-block.com",
            "password": "Pass123!"})
        assert signup.status_code == 200
        headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}
        user_id = signup.json()["user"]["id"]
        created.append(user_id)
        wallet = Account.create()
        if with_wallet:
            message = f"Link wallet {tag}"
            sig = wallet.sign_message(encode_defunct(text=message)).signature.hex()
            link = real_test_client.post("/api/v1/auth/wallet/link", headers=headers, json={
                "wallet_address": wallet.address, "signature": "0x" + sig.removeprefix("0x"), "message": message})
            assert link.status_code == 200, link.text
        return Person(user_id, headers, wallet)

    yield factory

    real_db_session.rollback()
    cause_ids = [c.id for c in real_db_session.query(Cause).filter(Cause.recipient_id.in_(created))]
    real_db_session.query(Donation).filter(
        (Donation.donor_id.in_(created)) | (Donation.cause_id.in_(cause_ids))).delete(synchronize_session=False)
    if cause_ids:
        real_db_session.query(Verification).filter(Verification.cause_id.in_(cause_ids)).delete(synchronize_session=False)
        real_db_session.query(Evidence).filter(Evidence.cause_id.in_(cause_ids)).delete(synchronize_session=False)
        real_db_session.query(Cause).filter(Cause.id.in_(cause_ids)).delete(synchronize_session=False)
    real_db_session.query(User).filter(User.id.in_(created)).delete(synchronize_session=False)
    real_db_session.commit()


def verified_cause(client, session, owner, status="Verified", target=50):
    r = client.post("/api/v1/causes", headers=owner.headers, json={
        "title": f"Causa {uuid.uuid4().hex[:6]}",
        "description": "Descripción de prueba suficientemente larga para validar", "target_amount": target})
    assert r.status_code == 200, r.text
    onchain = 400_000 + uuid.uuid4().int % 90_000
    session.query(Cause).filter(Cause.id == r.json()["id"]).update({"status": status, "onchain_cause_id": onchain})
    session.commit()
    return r.json()["id"], onchain


def fake_donation(monkeypatch, onchain, donor, amount=10_000_000, state=None):
    monkeypatch.setattr(donations_ep, "read_donation_received",
                        lambda tx: {"cause_id": onchain, "donor": donor.wallet.address, "amount": amount})
    monkeypatch.setattr(donations_ep, "read_cause_state", lambda i: state)


def confirm(client, cause_id, donor, tx="0x" + "a1" * 32):
    return client.post(f"/api/v1/causes/{cause_id}/donations/confirm", headers=donor.headers, json={"tx_hash": tx})


class TestDonateInstructionUC009:
    def test_uc009_returns_approve_and_donate_with_onchain_id(self, real_test_client, real_db_session, monkeypatch, make_user):
        owner, donor = make_user(), make_user()
        cause_id, onchain = verified_cause(real_test_client, real_db_session, owner)
        monkeypatch.setattr(donations_ep, "get_token_address", lambda: TOKEN)
        r = real_test_client.post(f"/api/v1/causes/{cause_id}/donate", headers=donor.headers, json={"amount": 12.5})
        assert r.status_code == 200
        body = r.json()
        assert body["function"] == "donate" and body["params"] == [onchain, 12_500_000]
        assert body["approve"] == {"contract": TOKEN, "function": "approve", "params": [body["contract"], 12_500_000]}

    def test_uc009_requires_linked_wallet(self, real_test_client, real_db_session, make_user):
        owner, donor = make_user(), make_user(with_wallet=False)
        cause_id, _ = verified_cause(real_test_client, real_db_session, owner)
        r = real_test_client.post(f"/api/v1/causes/{cause_id}/donate", headers=donor.headers, json={"amount": 1})
        assert r.status_code == 400

    @pytest.mark.parametrize("status", ["Pending", "Rejected", "Completed"])
    def test_uc009_br001_a4_a5_only_verified_causes(self, real_test_client, real_db_session, make_user, status):
        owner, donor = make_user(), make_user()
        cause_id, _ = verified_cause(real_test_client, real_db_session, owner, status=status)
        assert real_test_client.post(f"/api/v1/causes/{cause_id}/donate", headers=donor.headers,
                                     json={"amount": 1}).status_code == 400

    def test_uc009_a1_invalid_amount(self, real_test_client, real_db_session, make_user):
        owner, donor = make_user(), make_user()
        cause_id, _ = verified_cause(real_test_client, real_db_session, owner)
        assert real_test_client.post(f"/api/v1/causes/{cause_id}/donate", headers=donor.headers,
                                     json={"amount": 0}).status_code == 422


class TestRegisterDonationUC014:
    def test_uc014_registers_donation_and_updates_progress(self, real_test_client, real_db_session, monkeypatch, make_user):
        owner, donor = make_user(), make_user()
        cause_id, onchain = verified_cause(real_test_client, real_db_session, owner)
        fake_donation(monkeypatch, onchain, donor)
        r = confirm(real_test_client, cause_id, donor)
        assert r.status_code == 200
        assert Decimal(r.json()["amount"]) == Decimal("10") and r.json()["cause_status"] == "Verified"

        detail = real_test_client.get(f"/api/v1/causes/{cause_id}").json()
        assert Decimal(detail["collected"]) == Decimal("10")
        assert detail["donations"][0]["donor_wallet"].lower() == donor.wallet.address.lower()
        listed = {c["id"]: c for c in real_test_client.get("/api/v1/causes").json()}
        assert Decimal(listed[cause_id]["collected"]) == Decimal("10")  # UC-007 BR-002
        # UC-007 paso 3: la tarjeta trae descripción, nombre del receptor y (con evidencia) la URL de la imagen
        assert listed[cause_id]["description"] and listed[cause_id]["recipient_name"].startswith("e2e_d_")
        assert listed[cause_id]["image_url"] is None
        real_db_session.query(Cause).filter(Cause.id == cause_id).update({"image_hash": "a" * 64})
        real_db_session.commit()
        with_image = {c["id"]: c for c in real_test_client.get("/api/v1/causes").json()}
        assert with_image[cause_id]["image_url"] == f"/causes/{cause_id}/evidence"
        assert real_test_client.get(f"/api/v1/causes/{cause_id}").json()["recipient_name"] == listed[cause_id]["recipient_name"]

    def test_uc014_a2_same_transaction_is_not_duplicated(self, real_test_client, real_db_session, monkeypatch, make_user):
        owner, donor = make_user(), make_user()
        cause_id, onchain = verified_cause(real_test_client, real_db_session, owner)
        fake_donation(monkeypatch, onchain, donor)
        first, second = confirm(real_test_client, cause_id, donor), confirm(real_test_client, cause_id, donor)
        assert first.json()["id"] == second.json()["id"]
        assert real_db_session.query(Donation).filter(Donation.cause_id == cause_id).count() == 1

    def test_uc014_br002_hash_of_another_donor_is_rejected(self, real_test_client, real_db_session, monkeypatch, make_user):
        owner, donor, other = make_user(), make_user(), make_user()
        cause_id, onchain = verified_cause(real_test_client, real_db_session, owner)
        fake_donation(monkeypatch, onchain, donor)
        confirm(real_test_client, cause_id, donor)
        assert confirm(real_test_client, cause_id, other).status_code == 409

    def test_uc014_a1_a4_unconfirmed_transaction(self, real_test_client, real_db_session, monkeypatch, make_user):
        owner, donor = make_user(), make_user()
        cause_id, _ = verified_cause(real_test_client, real_db_session, owner)
        monkeypatch.setattr(donations_ep, "read_donation_received", lambda tx: None)
        assert confirm(real_test_client, cause_id, donor).status_code == 400
        assert real_db_session.query(Donation).filter(Donation.cause_id == cause_id).count() == 0

    def test_uc014_a3_donation_to_another_cause_or_wallet_is_rejected(self, real_test_client, real_db_session, monkeypatch, make_user):
        owner, donor, other = make_user(), make_user(), make_user()
        cause_id, onchain = verified_cause(real_test_client, real_db_session, owner)
        fake_donation(monkeypatch, onchain + 1, donor)          # otra causa
        assert confirm(real_test_client, cause_id, donor, "0x" + "b1" * 32).status_code == 400
        fake_donation(monkeypatch, onchain, other)               # otra wallet
        assert confirm(real_test_client, cause_id, donor, "0x" + "b2" * 32).status_code == 400

    def test_uc014_br004_completed_state_comes_from_contract(self, real_test_client, real_db_session, monkeypatch, make_user):
        owner, donor = make_user(), make_user()
        cause_id, onchain = verified_cause(real_test_client, real_db_session, owner, target=10)
        fake_donation(monkeypatch, onchain, donor, state={"status": 3, "collected": 10_000_000})
        assert confirm(real_test_client, cause_id, donor).json()["cause_status"] == "Completed"
        assert cause_id not in [c["id"] for c in real_test_client.get("/api/v1/causes").json()]

    def test_uc014_requires_published_existing_cause_and_session(self, real_test_client, real_db_session, make_user):
        owner, donor = make_user(), make_user()
        assert confirm(real_test_client, 999_999_999, donor).status_code == 404
        cause = real_test_client.post("/api/v1/causes", headers=owner.headers, json={
            "title": "Sin publicar", "description": "Descripción de prueba suficientemente larga", "target_amount": 5}).json()
        assert confirm(real_test_client, cause["id"], donor).status_code == 400
        assert real_test_client.post(f"/api/v1/causes/{cause['id']}/donations/confirm",
                                     json={"tx_hash": "0x" + "c1" * 32}).status_code in (401, 403)


class TestDashboardUC011:
    def test_uc011_donor_sees_own_donations_and_total(self, real_test_client, real_db_session, monkeypatch, make_user):
        owner, donor = make_user(), make_user()
        cause_id, onchain = verified_cause(real_test_client, real_db_session, owner)
        fake_donation(monkeypatch, onchain, donor)
        confirm(real_test_client, cause_id, donor)
        body = real_test_client.get(f"/api/v1/users/{donor.id}", headers=donor.headers).json()
        assert body["wallet_linked"] is True and body["recipient"] == {"causes": []}
        assert Decimal(body["donor"]["total_donated"]) == Decimal("10")
        assert body["donor"]["donations"][0]["cause_id"] == cause_id

    def test_uc011_a1_donor_without_donations(self, real_test_client, make_user):
        donor = make_user()
        body = real_test_client.get(f"/api/v1/users/{donor.id}", headers=donor.headers).json()
        assert Decimal(body["donor"]["total_donated"]) == 0 and body["donor"]["donations"] == []

    def test_uc011_one_account_sees_both_activities(self, real_test_client, real_db_session, monkeypatch, make_user):
        """Sin rol fijo: la misma cuenta publica una causa y dona a la de otra persona."""
        owner, donor = make_user(), make_user()
        cause_id, onchain = verified_cause(real_test_client, real_db_session, owner)
        fake_donation(monkeypatch, onchain, donor)
        confirm(real_test_client, cause_id, donor)
        mine, _ = verified_cause(real_test_client, real_db_session, donor)
        body = real_test_client.get(f"/api/v1/users/{donor.id}", headers=donor.headers).json()
        assert Decimal(body["donor"]["total_donated"]) == Decimal("10")
        assert [c["id"] for c in body["recipient"]["causes"]] == [mine]

    def test_uc011_recipient_sees_causes_collected_and_available(self, real_test_client, real_db_session, monkeypatch, make_user):
        owner, donor = make_user(), make_user()
        cause_id, onchain = verified_cause(real_test_client, real_db_session, owner)
        fake_donation(monkeypatch, onchain, donor)
        confirm(real_test_client, cause_id, donor)
        monkeypatch.setattr(users_ep, "read_cause_state", lambda i: {"status": 1, "collected": 10_000_000})
        item = real_test_client.get(f"/api/v1/users/{owner.id}", headers=owner.headers).json()["recipient"]["causes"][0]
        assert item["id"] == cause_id and item["status"] == "Verified"
        assert item["onchain_cause_id"] == onchain  # el receptor lo usa para firmar withdrawFunds
        assert Decimal(item["collected"]) == Decimal("10") and Decimal(item["available_to_withdraw"]) == Decimal("10")

    def test_uc011_available_is_none_when_chain_unreachable_or_not_verified(self, real_test_client, real_db_session, monkeypatch, make_user):
        owner = make_user()
        verified_cause(real_test_client, real_db_session, owner)
        verified_cause(real_test_client, real_db_session, owner, status="Pending")
        monkeypatch.setattr(users_ep, "read_cause_state", lambda i: None)
        causes = real_test_client.get(f"/api/v1/users/{owner.id}", headers=owner.headers).json()["recipient"]["causes"]
        assert len(causes) == 2 and all(c["available_to_withdraw"] is None for c in causes)

    def test_uc011_a2_recipient_without_causes(self, real_test_client, make_user):
        owner = make_user()
        assert real_test_client.get(f"/api/v1/users/{owner.id}", headers=owner.headers).json()["recipient"] == {"causes": []}

    def test_uc011_a3_wallet_not_linked_is_reported(self, real_test_client, make_user):
        donor = make_user(with_wallet=False)
        assert real_test_client.get(f"/api/v1/users/{donor.id}", headers=donor.headers).json()["wallet_linked"] is False

    def test_uc011_br002_cannot_view_another_dashboard(self, real_test_client, make_user):
        a, b = make_user(), make_user()
        assert real_test_client.get(f"/api/v1/users/{b.id}", headers=a.headers).status_code == 403
        assert real_test_client.get(f"/api/v1/users/{b.id}").status_code in (401, 403)
