# UC-006: agente de verificación (sin base de datos)

import asyncio
import json
from types import SimpleNamespace

import httpx
import pytest

from app.services import agent


def _completion(content: str) -> dict:
    return {"choices": [{"message": {"content": content}}]}


@pytest.fixture
def ai(monkeypatch):
    """Sustituye el cliente HTTP del agente por un transporte simulado."""
    calls = {"count": 0, "payloads": []}

    def install(handler):
        def wrapped(request: httpx.Request) -> httpx.Response:
            calls["count"] += 1
            calls["payloads"].append(json.loads(request.content))
            return handler(request)

        real = httpx.AsyncClient
        monkeypatch.setattr(
            agent.httpx, "AsyncClient",
            lambda *a, **kw: real(transport=httpx.MockTransport(wrapped), timeout=kw.get("timeout")),
        )

    async def no_sleep(_):
        return None

    monkeypatch.setattr(agent.asyncio, "sleep", no_sleep)
    calls["install"] = install
    return calls


def _verdict(verified=True, confidence=0.95, reason="ok"):
    return json.dumps({"verified": verified, "confidence": confidence, "reason": reason})


class TestParseVerdict:
    def test_uc006_a4_plain_json(self):
        assert agent._parse_verdict(_verdict())["verified"] is True

    def test_uc006_a4_markdown_fenced_json(self):
        assert agent._parse_verdict(f"```json\n{_verdict(False, 0.9)}\n```")["verified"] is False

    def test_uc006_a4_json_surrounded_by_prose(self):
        assert agent._parse_verdict(f"Resultado: {_verdict()} fin")["confidence"] == 0.95

    @pytest.mark.parametrize("bad", ["no puedo analizar", "{}", '{"verified": "yes", "confidence": 0.9}',
                                     '{"verified": true, "confidence": 1.7}', '{"verified": true}'])
    def test_uc006_a4_invalid_verdict_raises(self, bad):
        with pytest.raises(agent.VerificationUnavailable):
            agent._parse_verdict(bad)


class TestVerifyWithAI:
    def test_uc006_sends_real_image_and_description(self, ai):
        ai["install"](lambda r: httpx.Response(200, json=_completion(_verdict())))
        result = asyncio.run(agent.verify_cause_with_ai(b"\x89PNGdata", "image/png", "techo dañado"))
        assert result["verified"] is True
        content = ai["payloads"][0]["messages"][0]["content"]
        assert content[0]["image_url"]["url"].startswith("data:image/png;base64,")
        assert "techo dañado" in content[1]["text"]

    def test_uc006_br002_low_confidence_is_not_verified(self, ai):
        ai["install"](lambda r: httpx.Response(200, json=_completion(_verdict(True, 0.79))))
        assert asyncio.run(agent.verify_cause_with_ai(b"x", "image/jpeg", "d"))["verified"] is False

    def test_uc006_br002_threshold_boundary_is_verified(self, ai):
        ai["install"](lambda r: httpx.Response(200, json=_completion(_verdict(True, 0.80))))
        assert asyncio.run(agent.verify_cause_with_ai(b"x", "image/jpeg", "d"))["verified"] is True

    def test_uc006_a2_retries_then_recovers(self, ai):
        responses = iter([httpx.Response(503), httpx.Response(200, json=_completion(_verdict()))])
        ai["install"](lambda r: next(responses))
        assert asyncio.run(agent.verify_cause_with_ai(b"x", "image/jpeg", "d"))["verified"] is True
        assert ai["count"] == 2

    def test_uc006_a3_exhausted_retries_raise(self, ai):
        ai["install"](lambda r: httpx.Response(500))
        with pytest.raises(agent.VerificationUnavailable):
            asyncio.run(agent.verify_cause_with_ai(b"x", "image/jpeg", "d"))
        assert ai["count"] == 3

    def test_uc006_a4_unreadable_response_is_retried_then_raises(self, ai):
        ai["install"](lambda r: httpx.Response(200, json=_completion("no puedo analizar")))
        with pytest.raises(agent.VerificationUnavailable):
            asyncio.run(agent.verify_cause_with_ai(b"x", "image/jpeg", "d"))
        assert ai["count"] == 3

    def test_uc006_a2_timeout_is_retried(self, ai):
        def boom(request):
            raise httpx.ReadTimeout("slow")
        ai["install"](boom)
        with pytest.raises(agent.VerificationUnavailable):
            asyncio.run(agent.verify_cause_with_ai(b"x", "image/jpeg", "d"))
        assert ai["count"] == 3


def test_uc006_br004_verification_hash_is_deterministic():
    a = agent.compute_verification_hash({"verified": True, "confidence": 0.9, "reason": "x"})
    b = agent.compute_verification_hash({"reason": "x", "confidence": 0.9, "verified": True})
    assert a == b and len(a) == 64
    assert a != agent.compute_verification_hash({"verified": False, "confidence": 0.9, "reason": "x"})


class _FakeEth:
    def __init__(self, status=1, key_address=None):
        self.status = status
        self.account = SimpleNamespace(
            from_key=lambda k: SimpleNamespace(address=key_address or agent.settings.agent_address),
            sign_transaction=lambda tx, k: SimpleNamespace(raw_transaction=b"raw"),
        )
        self.gas_price = 1

    def get_transaction_count(self, a):
        return 7

    def send_raw_transaction(self, raw):
        return b"\x12" * 32

    def wait_for_transaction_receipt(self, h, timeout):
        return SimpleNamespace(status=self.status)


class _FakeW3:
    def __init__(self, eth, connected=True):
        self.eth = eth
        self._connected = connected

    def is_connected(self):
        return self._connected

    @staticmethod
    def to_hex(b):
        return "0x" + b.hex()


class _FakeContract:
    class functions:
        @staticmethod
        def verifyCause(cause_id, verified, h):
            return SimpleNamespace(build_transaction=lambda params: {"nonce": params["nonce"]})


class TestSignVerificationTx:
    def _patch(self, monkeypatch, eth, connected=True):
        monkeypatch.setattr(agent, "get_w3", lambda: _FakeW3(eth, connected))
        monkeypatch.setattr(agent, "get_contract", lambda w3: _FakeContract)

    def test_uc006_returns_hash_on_confirmed_receipt(self, monkeypatch):
        self._patch(monkeypatch, _FakeEth(status=1))
        assert agent.sign_verification_tx(0, True, "h") == "0x" + "12" * 32

    def test_uc006_a5_reverted_tx_returns_none(self, monkeypatch):
        self._patch(monkeypatch, _FakeEth(status=0))
        assert agent.sign_verification_tx(0, True, "h") is None

    def test_uc006_a5_rpc_down_returns_none(self, monkeypatch):
        self._patch(monkeypatch, _FakeEth(), connected=False)
        assert agent.sign_verification_tx(0, True, "h") is None

    def test_uc006_br001_key_must_match_agent_address(self, monkeypatch):
        self._patch(monkeypatch, _FakeEth(key_address="0x000000000000000000000000000000000000dEaD"))
        assert agent.sign_verification_tx(0, True, "h") is None
