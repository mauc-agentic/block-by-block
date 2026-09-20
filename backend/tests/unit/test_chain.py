# UC-013, UC-014: lectura de la cadena (sin red)

from types import SimpleNamespace

import pytest

from app.services import chain

VAULT = "0x591723EDF457032ad341366f4654a973fbd0dAA9"
ROGUE = "0x000000000000000000000000000000000000dEaD"
DONOR = "0x94C5E2065F555e01364ad83879D3ADDD298E706f"


def log(event, address=VAULT, **args):
    return SimpleNamespace(address=address, event=event, args=SimpleNamespace(**args))


class FakeEvent:
    def __init__(self, name):
        self.name = name

    def process_log(self, entry):
        if entry.event != self.name:
            raise ValueError("mismatched ABI")
        return SimpleNamespace(args=entry.args)


class FakeContract:
    address = VAULT
    events = SimpleNamespace(CauseCreated=lambda: FakeEvent("CauseCreated"),
                             DonationReceived=lambda: FakeEvent("DonationReceived"))

    def __init__(self, cause=(DONOR, "t", "d", 10_000_000, 4_000_000, 1, 0, True, ""), token="0xToken"):
        self._cause, self._token = cause, token
        self.functions = SimpleNamespace(
            getCause=lambda i: SimpleNamespace(call=lambda: self._cause),
            token=lambda: SimpleNamespace(call=lambda: self._token),
        )


class FakeW3:
    def __init__(self, receipt=None, error=False):
        self._receipt, self._error = receipt, error
        self.eth = SimpleNamespace(get_transaction_receipt=self._get)

    def _get(self, tx):
        if self._error:
            raise RuntimeError("TransactionNotFound")
        return self._receipt


@pytest.fixture
def patch_chain(monkeypatch):
    def install(receipt=None, error=False, contract=None):
        monkeypatch.setattr(chain, "get_w3", lambda: FakeW3(receipt, error))
        monkeypatch.setattr(chain, "get_contract", lambda w3: contract or FakeContract())
    return install


def receipt(*logs, status=1):
    return SimpleNamespace(status=status, logs=list(logs))


CREATED = dict(causeId=3, recipient=DONOR, targetAmount=25_000_000, title="Techo")
DONATION = dict(causeId=3, donor=DONOR, amount=5_000_000)


class TestReadCauseCreated:
    def test_uc013_returns_event_from_vault(self, patch_chain):
        patch_chain(receipt(log("CauseCreated", **CREATED)))
        assert chain.read_cause_created("0x1") == {"cause_id": 3, "recipient": DONOR,
                                                   "target_amount": 25_000_000, "title": "Techo"}

    def test_uc013_ignores_event_emitted_by_another_contract(self, patch_chain):
        patch_chain(receipt(log("CauseCreated", address=ROGUE, **CREATED)))
        assert chain.read_cause_created("0x1") is None

    def test_uc013_a3_reverted_missing_or_unrelated_tx_returns_none(self, patch_chain):
        patch_chain(receipt(log("CauseCreated", **CREATED), status=0))
        assert chain.read_cause_created("0x1") is None
        patch_chain(error=True)
        assert chain.read_cause_created("0x1") is None
        patch_chain(receipt(log("DonationReceived", **DONATION)))
        assert chain.read_cause_created("0x1") is None


class TestReadDonationReceived:
    def test_uc014_returns_event_from_vault(self, patch_chain):
        patch_chain(receipt(log("DonationReceived", **DONATION)))
        assert chain.read_donation_received("0x1") == {"cause_id": 3, "donor": DONOR, "amount": 5_000_000}

    def test_uc014_skips_foreign_logs_and_finds_vault_log(self, patch_chain):
        patch_chain(receipt(log("DonationReceived", address=ROGUE, **{**DONATION, "amount": 999}),
                            log("DonationReceived", **DONATION)))
        assert chain.read_donation_received("0x1")["amount"] == 5_000_000

    def test_uc014_a1_a4_unconfirmed_returns_none(self, patch_chain):
        patch_chain(error=True)
        assert chain.read_donation_received("0x1") is None
        patch_chain(receipt(log("DonationReceived", **DONATION), status=0))
        assert chain.read_donation_received("0x1") is None
        patch_chain(receipt(log("CauseCreated", **CREATED)))
        assert chain.read_donation_received("0x1") is None


class TestContractReads:
    def test_uc014_br004_read_cause_state(self, patch_chain):
        patch_chain(contract=FakeContract(cause=(DONOR, "t", "d", 10, 4_000_000, 3, 0, True, "")))
        assert chain.read_cause_state(3) == {"status": 3, "collected": 4_000_000}

    def test_read_cause_state_returns_none_when_rpc_fails(self, monkeypatch):
        def boom():
            raise RuntimeError("rpc down")
        monkeypatch.setattr(chain, "get_w3", boom)
        assert chain.read_cause_state(3) is None

    def test_uc009_token_address_comes_from_vault(self, patch_chain):
        chain.get_token_address.cache_clear()
        patch_chain(contract=FakeContract(token="0xTokenAddress"))
        assert chain.get_token_address() == "0xTokenAddress"
        chain.get_token_address.cache_clear()
