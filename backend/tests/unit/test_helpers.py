# tests/unit/test_helpers.py
# UC-003: Validación de firma de wallet sin dependencias de BD/FastAPI

import pytest
from eth_account import Account
from eth_account.messages import encode_defunct


def test_uc003_br001_verify_wallet_signature_valid():
    """BR-001: Valida una firma correcta."""
    from app.utils.helpers import verify_wallet_signature

    acct = Account.create()
    message = "Link wallet to Block by Block — 2026-09-20T10:30:00Z"

    msg = encode_defunct(text=message)
    signed_msg = acct.sign_message(msg)

    result = verify_wallet_signature(
        message=message,
        signature=signed_msg.signature.hex(),
        wallet_address=acct.address
    )

    assert result is True


def test_uc003_a1_verify_wallet_signature_invalid_message():
    """BR-001: Rechaza firma para mensaje diferente."""
    from app.utils.helpers import verify_wallet_signature

    acct = Account.create()
    message1 = "Link wallet to Block by Block — 2026-09-20T10:30:00Z"
    message2 = "Different message"

    msg = encode_defunct(text=message1)
    signed_msg = acct.sign_message(msg)

    result = verify_wallet_signature(
        message=message2,
        signature=signed_msg.signature.hex(),
        wallet_address=acct.address
    )

    assert result is False


def test_uc003_a1_verify_wallet_signature_invalid_address():
    """BR-001: Rechaza firma para dirección diferente."""
    from app.utils.helpers import verify_wallet_signature

    acct1 = Account.create()
    acct2 = Account.create()
    message = "Link wallet to Block by Block"

    msg = encode_defunct(text=message)
    signed_msg = acct1.sign_message(msg)

    result = verify_wallet_signature(
        message=message,
        signature=signed_msg.signature.hex(),
        wallet_address=acct2.address
    )

    assert result is False


def test_uc003_a1_verify_wallet_signature_malformed():
    """BR-001: Rechaza firma malformada."""
    from app.utils.helpers import verify_wallet_signature

    acct = Account.create()
    message = "Link wallet to Block by Block"
    malformed_sig = "0x" + "00" * 65

    result = verify_wallet_signature(
        message=message,
        signature=malformed_sig,
        wallet_address=acct.address
    )

    assert result is False


def test_uc003_br001_verify_wallet_signature_case_insensitive():
    """BR-001: Validar firma es case-insensitive."""
    from app.utils.helpers import verify_wallet_signature

    acct = Account.create()
    message = "Link wallet to Block by Block"

    msg = encode_defunct(text=message)
    signed_msg = acct.sign_message(msg)

    result = verify_wallet_signature(
        message=message,
        signature=signed_msg.signature.hex(),
        wallet_address=acct.address.upper()
    )

    assert result is True


def test_uc001_br004_derive_username_normalizes_accents_and_spaces():
    """UC-001 BR-004: deriva un username en minúsculas, sin espacios ni acentos."""
    from app.utils.helpers import derive_username

    assert derive_username("Ada Lovelace") == "adalovelace"
    assert derive_username("José Núñez") == "josenunez"


def test_uc001_br004_derive_username_falls_back_when_empty():
    """UC-001 BR-004: si el nombre no produce caracteres válidos, usa un valor por defecto."""
    from app.utils.helpers import derive_username

    assert derive_username("!!!") == "usuario"
