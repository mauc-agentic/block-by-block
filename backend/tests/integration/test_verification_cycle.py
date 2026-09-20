# UC-005, UC-006, UC-013: ciclo de verificación contra Supabase real.
# La IA y la cadena se simulan; la base de datos es real.

import asyncio
import uuid

import pytest
from eth_account import Account
from eth_account.messages import encode_defunct

import app.api.v1.endpoints.causes as causes_ep
from app import tasks as tasks_mod
from app.db import Base
from app.db.models import Cause, Evidence, User, Verification
from app.services import agent
from tests.integration.test_supabase_integration import (  # noqa: F401  (fixtures compartidas)
    real_db_session,
    real_engine,
    real_test_client,
)

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 32


@pytest.fixture(scope="module", autouse=True)
def _tables(real_engine):
    Base.metadata.create_all(bind=real_engine)


@pytest.fixture
def recipient(real_test_client, real_db_session):
    """Receptor real con wallet vinculada por firma (UC-003)."""
    tag = uuid.uuid4().hex[:8]
    signup = real_test_client.post("/api/v1/auth/signup", json={
        "username": f"e2e_v_{tag}", "email": f"e2e_v_{tag}@block-by-block.com",
        "password": "Pass123!",
    })
    assert signup.status_code == 200
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}
    user_id = signup.json()["user"]["id"]

    wallet = Account.create()
    message = f"Link wallet {tag}"
    link = real_test_client.post("/api/v1/auth/wallet/link", headers=headers, json={
        "wallet_address": wallet.address,
        "signature": "0x" + wallet.sign_message(encode_defunct(text=message)).signature.hex().removeprefix("0x"),
        "message": message,
    })
    assert link.status_code == 200, link.text

    yield SimpleNs(id=user_id, headers=headers, wallet=wallet, tag=tag)

    real_db_session.rollback()
    cause_ids = [c.id for c in real_db_session.query(Cause).filter(Cause.recipient_id == user_id)]
    if cause_ids:
        real_db_session.query(Verification).filter(Verification.cause_id.in_(cause_ids)).delete(synchronize_session=False)
        real_db_session.query(Evidence).filter(Evidence.cause_id.in_(cause_ids)).delete(synchronize_session=False)
        real_db_session.query(Cause).filter(Cause.id.in_(cause_ids)).delete(synchronize_session=False)
    real_db_session.query(User).filter(User.id == user_id).delete()
    real_db_session.commit()


class SimpleNs:
    def __init__(self, **kw):
        self.__dict__.update(kw)


def _new_cause(client, recipient, title=None):
    r = client.post("/api/v1/causes", headers=recipient.headers, json={
        "title": title or f"Causa {recipient.tag}",
        "description": "Descripción de prueba suficientemente larga para validar",
        "target_amount": 25.5,
    })
    assert r.status_code == 200, r.text
    return r.json()


def _event(recipient, cause, on_chain_id):
    return {"cause_id": on_chain_id, "recipient": recipient.wallet.address,
            "title": cause["title"], "target_amount": 25_500_000}


class TestPublishUC013:
    def test_uc013_publish_returns_signature_instruction(self, real_test_client, recipient):
        cause = _new_cause(real_test_client, recipient)
        r = real_test_client.post(f"/api/v1/causes/{cause['id']}/publish", headers=recipient.headers)
        assert r.status_code == 200
        body = r.json()
        assert body["function"] == "createCause" and body["status"] == "sign_required"
        assert body["params"] == [cause["title"], "Descripción de prueba suficientemente larga para validar", 25_500_000]

    def test_uc013_a6_requires_linked_wallet(self, real_test_client, real_db_session, recipient):
        cause = _new_cause(real_test_client, recipient)
        real_db_session.query(User).filter(User.id == recipient.id).update({"wallet_address": None})
        real_db_session.commit()
        assert real_test_client.post(f"/api/v1/causes/{cause['id']}/publish", headers=recipient.headers).status_code == 400

    def test_uc013_a4_only_owner_publishes(self, real_test_client, recipient):
        cause = _new_cause(real_test_client, recipient)
        assert real_test_client.post(f"/api/v1/causes/{cause['id']}/publish").status_code in (401, 403)

    def test_uc013_confirm_links_onchain_id_and_a2_blocks_republish(self, real_test_client, monkeypatch, recipient):
        cause = _new_cause(real_test_client, recipient)
        onchain_id = 900_000 + uuid.uuid4().int % 90_000
        monkeypatch.setattr(causes_ep, "read_cause_created", lambda tx: _event(recipient, cause, onchain_id))
        r = real_test_client.post(f"/api/v1/causes/{cause['id']}/publish/confirm",
                                  headers=recipient.headers, json={"tx_hash": "0x" + "ab" * 32})
        assert r.status_code == 200 and r.json()["onchain_cause_id"] == onchain_id
        for path in ("publish", "publish/confirm"):  # A2
            body = {"tx_hash": "0x" + "ab" * 32} if path.endswith("confirm") else None
            again = real_test_client.post(f"/api/v1/causes/{cause['id']}/{path}", headers=recipient.headers, json=body)
            assert again.status_code == 409

    def test_uc013_a3_unconfirmed_tx_is_rejected(self, real_test_client, monkeypatch, recipient):
        cause = _new_cause(real_test_client, recipient)
        monkeypatch.setattr(causes_ep, "read_cause_created", lambda tx: None)
        r = real_test_client.post(f"/api/v1/causes/{cause['id']}/publish/confirm",
                                  headers=recipient.headers, json={"tx_hash": "0x" + "cd" * 32})
        assert r.status_code == 400

    @pytest.mark.parametrize("field,value", [("recipient", "0x000000000000000000000000000000000000dEaD"),
                                             ("title", "Otro título"), ("target_amount", 1)])
    def test_uc013_a5_mismatched_tx_is_rejected(self, real_test_client, monkeypatch, recipient, field, value):
        cause = _new_cause(real_test_client, recipient)
        event = {**_event(recipient, cause, 1), field: value}
        monkeypatch.setattr(causes_ep, "read_cause_created", lambda tx: event)
        r = real_test_client.post(f"/api/v1/causes/{cause['id']}/publish/confirm",
                                  headers=recipient.headers, json={"tx_hash": "0x" + "ef" * 32})
        assert r.status_code == 400

    def test_uc013_br002_onchain_id_is_unique(self, real_test_client, monkeypatch, recipient):
        first, second = _new_cause(real_test_client, recipient), _new_cause(real_test_client, recipient)
        onchain_id = 800_000 + uuid.uuid4().int % 90_000
        monkeypatch.setattr(causes_ep, "read_cause_created", lambda tx: {**_event(recipient, first, onchain_id)})
        assert real_test_client.post(f"/api/v1/causes/{first['id']}/publish/confirm", headers=recipient.headers,
                                     json={"tx_hash": "0x" + "11" * 32}).status_code == 200
        monkeypatch.setattr(causes_ep, "read_cause_created", lambda tx: {**_event(recipient, second, onchain_id)})
        assert real_test_client.post(f"/api/v1/causes/{second['id']}/publish/confirm", headers=recipient.headers,
                                     json={"tx_hash": "0x" + "22" * 32}).status_code == 409


class TestEvidenceUC005:
    def test_uc005_stores_evidence_and_waits_for_publication(self, real_test_client, monkeypatch, recipient):
        queued = []
        monkeypatch.setattr(causes_ep, "enqueue_verification", queued.append)
        cause = _new_cause(real_test_client, recipient)
        r = real_test_client.post(f"/api/v1/causes/{cause['id']}/upload-image", headers=recipient.headers,
                                  files={"image": ("a.png", PNG, "image/png")})
        assert r.status_code == 200 and len(r.json()["image_hash"]) == 64
        assert queued == []  # UC-013 BR-004: sin publicación no hay verificación

    def test_uc013_step6_confirm_after_evidence_enqueues_verification(self, real_test_client, monkeypatch, recipient):
        queued = []
        monkeypatch.setattr(causes_ep, "enqueue_verification", queued.append)
        cause = _new_cause(real_test_client, recipient)
        real_test_client.post(f"/api/v1/causes/{cause['id']}/upload-image", headers=recipient.headers,
                              files={"image": ("a.jpg", JPG, "image/jpeg")})
        monkeypatch.setattr(causes_ep, "read_cause_created", lambda tx: _event(recipient, cause, 700_000 + uuid.uuid4().int % 90_000))
        real_test_client.post(f"/api/v1/causes/{cause['id']}/publish/confirm", headers=recipient.headers,
                              json={"tx_hash": "0x" + "33" * 32})
        assert queued == [cause["id"]]

    def test_uc005_upload_after_publication_enqueues(self, real_test_client, monkeypatch, recipient):
        queued = []
        monkeypatch.setattr(causes_ep, "enqueue_verification", queued.append)
        cause = _new_cause(real_test_client, recipient)
        monkeypatch.setattr(causes_ep, "read_cause_created", lambda tx: _event(recipient, cause, 600_000 + uuid.uuid4().int % 90_000))
        real_test_client.post(f"/api/v1/causes/{cause['id']}/publish/confirm", headers=recipient.headers,
                              json={"tx_hash": "0x" + "44" * 32})
        r = real_test_client.post(f"/api/v1/causes/{cause['id']}/upload-image", headers=recipient.headers,
                                  files={"image": ("a.png", PNG, "image/png")})
        assert r.json()["status"] == "queued for verification" and queued == [cause["id"]]

    def test_uc005_a3_replacement_keeps_single_evidence(self, real_test_client, real_db_session, recipient):
        cause = _new_cause(real_test_client, recipient)
        for name, body, ctype in (("a.png", PNG, "image/png"), ("b.jpg", JPG, "image/jpeg")):
            assert real_test_client.post(f"/api/v1/causes/{cause['id']}/upload-image", headers=recipient.headers,
                                         files={"image": (name, body, ctype)}).status_code == 200
        rows = real_db_session.query(Evidence).filter(Evidence.cause_id == cause["id"]).all()
        assert len(rows) == 1 and rows[0].content_type == "image/jpeg"

    @pytest.mark.parametrize("body,ctype,expected", [(PNG, "image/gif", 400), (b"not an image", "image/png", 400),
                                                     (PNG + b"\x00" * (5 * 1024 * 1024), "image/png", 413)])
    def test_uc005_a1_invalid_image_rejected(self, real_test_client, recipient, body, ctype, expected):
        cause = _new_cause(real_test_client, recipient)
        r = real_test_client.post(f"/api/v1/causes/{cause['id']}/upload-image", headers=recipient.headers,
                                  files={"image": ("x", body, ctype)})
        assert r.status_code == expected

    def test_uc005_br001_only_owner_uploads(self, real_test_client, recipient):
        cause = _new_cause(real_test_client, recipient)
        r = real_test_client.post(f"/api/v1/causes/{cause['id']}/upload-image",
                                  files={"image": ("a.png", PNG, "image/png")})
        assert r.status_code in (401, 403)

    def test_fr021_evidence_hidden_while_pending_and_served_after_verdict(self, real_test_client, real_db_session, recipient):
        cause = _new_cause(real_test_client, recipient)
        real_test_client.post(f"/api/v1/causes/{cause['id']}/upload-image", headers=recipient.headers,
                              files={"image": ("a.png", PNG, "image/png")})
        assert real_test_client.get(f"/api/v1/causes/{cause['id']}/evidence").status_code == 404
        real_db_session.query(Cause).filter(Cause.id == cause["id"]).update({"status": "Rejected"})
        real_db_session.commit()
        r = real_test_client.get(f"/api/v1/causes/{cause['id']}/evidence")
        assert r.status_code == 200 and r.content == PNG and r.headers["content-type"] == "image/png"

    def test_uc005_br003_no_upload_after_verification(self, real_test_client, real_db_session, recipient):
        cause = _new_cause(real_test_client, recipient)
        real_db_session.query(Cause).filter(Cause.id == cause["id"]).update({"status": "Verified"})
        real_db_session.commit()
        r = real_test_client.post(f"/api/v1/causes/{cause['id']}/upload-image", headers=recipient.headers,
                                  files={"image": ("a.png", PNG, "image/png")})
        assert r.status_code == 400


class TestAgentCycleUC006:
    """verify_cause_task con IA y cadena simuladas y BD real."""

    def _prepare(self, client, session, recipient, monkeypatch, published=True, with_evidence=True):
        cause = _new_cause(client, recipient)
        if published:
            session.query(Cause).filter(Cause.id == cause["id"]).update({"onchain_cause_id": 500_000 + uuid.uuid4().int % 90_000})
        if with_evidence:
            session.add(Evidence(cause_id=cause["id"], content_type="image/png", sha256="0" * 64, data=PNG))
        session.commit()
        return cause["id"]

    def _run(self, cause_id, monkeypatch, verdict=None, ai_error=False, tx_hash="0x" + "aa" * 32):
        async def fake_ai(image, ctype, description):
            if ai_error:
                raise agent.VerificationUnavailable("down")
            assert image == PNG and ctype == "image/png"
            return verdict
        sent = []
        monkeypatch.setattr(agent, "verify_cause_with_ai", fake_ai)
        monkeypatch.setattr(agent, "sign_verification_tx",
                            lambda oid, v, h: sent.append((oid, v, h)) or tx_hash)
        asyncio.run(agent.verify_cause_task(self.cause_id))
        return sent

    def _status(self, session, cause_id):
        session.expire_all()
        return session.query(Cause).filter(Cause.id == cause_id).one()

    def test_uc006_br005_verified_verdict_updates_status(self, real_test_client, real_db_session, monkeypatch, recipient):
        self.cause_id = self._prepare(real_test_client, real_db_session, recipient, monkeypatch)
        sent = self._run(self.cause_id, monkeypatch, {"verified": True, "confidence": 0.95, "reason": "ok"})
        cause = self._status(real_db_session, self.cause_id)
        assert cause.status == "Verified" and cause.verification_hash and len(sent) == 1
        assert sent[0][0] == cause.onchain_cause_id and sent[0][1] is True  # GAP-003: usa el id on-chain
        assert cause.verification.tx_hash == "0x" + "aa" * 32
        listed = real_test_client.get("/api/v1/causes").json()
        assert self.cause_id in [c["id"] for c in listed]

    def test_uc006_a1_rejected_verdict_updates_status(self, real_test_client, real_db_session, monkeypatch, recipient):
        self.cause_id = self._prepare(real_test_client, real_db_session, recipient, monkeypatch)
        self._run(self.cause_id, monkeypatch, {"verified": False, "confidence": 0.9, "reason": "no coincide"})
        cause = self._status(real_db_session, self.cause_id)
        assert cause.status == "Rejected" and cause.verification.reason == "no coincide"
        assert self.cause_id not in [c["id"] for c in real_test_client.get("/api/v1/causes").json()]

    def test_uc006_a3_ai_unavailable_keeps_pending(self, real_test_client, real_db_session, monkeypatch, recipient):
        self.cause_id = self._prepare(real_test_client, real_db_session, recipient, monkeypatch)
        sent = self._run(self.cause_id, monkeypatch, ai_error=True)
        cause = self._status(real_db_session, self.cause_id)
        assert cause.status == "Pending" and sent == [] and cause.verification is None

    def test_uc006_a5_onchain_failure_keeps_pending(self, real_test_client, real_db_session, monkeypatch, recipient):
        async def instant(_):
            return None
        monkeypatch.setattr(agent.asyncio, "sleep", instant)
        self.cause_id = self._prepare(real_test_client, real_db_session, recipient, monkeypatch)
        sent = self._run(self.cause_id, monkeypatch, {"verified": True, "confidence": 0.99, "reason": "ok"}, tx_hash=None)
        cause = self._status(real_db_session, self.cause_id)
        assert cause.status == "Pending" and len(sent) == 3  # 3 reintentos
        assert cause.verification.tx_hash is None and cause.verification_hash is None

    def test_uc006_br006_without_evidence_nothing_happens(self, real_test_client, real_db_session, monkeypatch, recipient):
        self.cause_id = self._prepare(real_test_client, real_db_session, recipient, monkeypatch, with_evidence=False)
        sent = self._run(self.cause_id, monkeypatch, {"verified": True, "confidence": 0.9, "reason": "x"})
        assert sent == [] and self._status(real_db_session, self.cause_id).status == "Pending"

    def test_uc013_br004_unpublished_cause_is_not_verified(self, real_test_client, real_db_session, monkeypatch, recipient):
        self.cause_id = self._prepare(real_test_client, real_db_session, recipient, monkeypatch, published=False)
        sent = self._run(self.cause_id, monkeypatch, {"verified": True, "confidence": 0.9, "reason": "x"})
        assert sent == [] and self._status(real_db_session, self.cause_id).status == "Pending"

    def test_uc006_retry_updates_single_verification_row(self, real_test_client, real_db_session, monkeypatch, recipient):
        self.cause_id = self._prepare(real_test_client, real_db_session, recipient, monkeypatch)
        real_db_session.add(Verification(cause_id=self.cause_id, verified=False, confidence=0.5, reason="previo"))
        real_db_session.commit()
        self._run(self.cause_id, monkeypatch, {"verified": True, "confidence": 0.9, "reason": "nuevo"})
        rows = real_db_session.query(Verification).filter(Verification.cause_id == self.cause_id).all()
        assert len(rows) == 1 and rows[0].reason == "nuevo"

    def test_uc006_br009_verdict_reason_and_confidence_are_visible_in_detail_and_dashboard(self, real_test_client, real_db_session, monkeypatch, recipient):
        self.cause_id = self._prepare(real_test_client, real_db_session, recipient, monkeypatch)
        before = real_test_client.get(f"/api/v1/causes/{self.cause_id}").json()
        assert before["verification_reason"] is None and before["verification_confidence"] is None  # sin veredicto no se muestra nada

        self._run(self.cause_id, monkeypatch, {"verified": False, "confidence": 0.9, "reason": "no coincide con la descripción"})
        detail = real_test_client.get(f"/api/v1/causes/{self.cause_id}").json()
        assert detail["status"] == "Rejected"
        assert detail["verification_reason"] == "no coincide con la descripción"
        assert float(detail["verification_confidence"]) == pytest.approx(0.9)

        mine = real_test_client.get("/api/v1/users/me/dashboard", headers=recipient.headers).json()["causes"]
        item = next(c for c in mine if c["id"] == self.cause_id)
        assert item["verification_reason"] == "no coincide con la descripción"
        assert float(item["verification_confidence"]) == pytest.approx(0.9)


class TestRetryVerificationUC006:
    """UC-006 A6, A7, A8, BR-007, BR-008."""

    def _ready_cause(self, client, session, recipient, published=True, evidence=True):
        cause = _new_cause(client, recipient)
        if published:
            session.query(Cause).filter(Cause.id == cause["id"]).update(
                {"onchain_cause_id": 300_000 + uuid.uuid4().int % 90_000})
        if evidence:
            session.add(Evidence(cause_id=cause["id"], content_type="image/png", sha256="0" * 64, data=PNG))
        session.commit()
        return cause["id"]

    def _capture(self, monkeypatch):
        queued = []
        monkeypatch.setattr(causes_ep, "is_verifying", lambda cid: False)
        monkeypatch.setattr(causes_ep, "enqueue_verification", lambda cid: queued.append(cid) or True)
        return queued

    def test_uc006_a6_owner_can_retry_a_pending_published_cause_with_evidence(self, real_test_client, real_db_session, monkeypatch, recipient):
        queued = self._capture(monkeypatch)
        cause_id = self._ready_cause(real_test_client, real_db_session, recipient)
        r = real_test_client.post(f"/api/v1/causes/{cause_id}/verify", headers=recipient.headers)
        assert r.status_code == 202 and r.json()["status"] == "queued for verification"
        assert queued == [cause_id]

    def test_uc006_br008_only_the_owner_can_retry(self, real_test_client, real_db_session, monkeypatch, recipient):
        queued = self._capture(monkeypatch)
        cause_id = self._ready_cause(real_test_client, real_db_session, recipient)
        assert real_test_client.post(f"/api/v1/causes/{cause_id}/verify").status_code in (401, 403)
        assert queued == []

    @pytest.mark.parametrize("state,expected", [
        ({"status": "Verified"}, "Can only verify Pending causes"),
        ({"status": "Rejected"}, "Can only verify Pending causes"),
        ({"published": False}, "Publish the cause on-chain first"),
        ({"evidence": False}, "Upload evidence first"),
    ])
    def test_uc006_a6_retry_requires_pending_published_and_with_evidence(self, real_test_client, real_db_session, monkeypatch, recipient, state, expected):
        queued = self._capture(monkeypatch)
        cause_id = self._ready_cause(real_test_client, real_db_session, recipient,
                                     published=state.get("published", True), evidence=state.get("evidence", True))
        if "status" in state:
            real_db_session.query(Cause).filter(Cause.id == cause_id).update({"status": state["status"]})
            real_db_session.commit()
        r = real_test_client.post(f"/api/v1/causes/{cause_id}/verify", headers=recipient.headers)
        assert r.status_code == 400 and r.json()["detail"] == expected
        assert queued == []

    def test_uc006_a8_second_request_while_running_is_rejected(self, real_test_client, real_db_session, monkeypatch, recipient):
        queued = self._capture(monkeypatch)
        monkeypatch.setattr(causes_ep, "is_verifying", lambda cid: True)
        cause_id = self._ready_cause(real_test_client, real_db_session, recipient)
        r = real_test_client.post(f"/api/v1/causes/{cause_id}/verify", headers=recipient.headers)
        assert r.status_code == 409 and queued == []

    def test_uc006_a7_startup_sweep_requeues_only_pending_published_with_evidence(self, real_test_client, real_db_session, monkeypatch, recipient):
        ready = self._ready_cause(real_test_client, real_db_session, recipient)
        no_evidence = self._ready_cause(real_test_client, real_db_session, recipient, evidence=False)
        unpublished = self._ready_cause(real_test_client, real_db_session, recipient, published=False)
        done = self._ready_cause(real_test_client, real_db_session, recipient)
        real_db_session.query(Cause).filter(Cause.id == done).update({"status": "Verified"})
        real_db_session.commit()

        queued = []
        monkeypatch.setattr(tasks_mod, "enqueue_verification", lambda cid: queued.append(cid) or True)
        result = tasks_mod.resume_pending_verifications()
        mine = {ready, no_evidence, unpublished, done}
        assert set(result) & mine == {ready} and set(queued) & mine == {ready}
