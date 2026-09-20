# scripts/donate.py: validaciones y fragmento de confirmación (sin red)

from decimal import Decimal

import pytest

from scripts import donate as dn

ME = "0x94C5E2065F555e01364ad83879D3ADDD298E706f"
OTHER = "0x4FD6A9678aD2332A50C64c8e4c3cB1179588f999"


@pytest.mark.parametrize("amount", ["0", "-1", "100.01", "0.0000001"])
def test_uc009_a1_invalid_amounts_are_rejected(amount):
    with pytest.raises(ValueError):
        dn.validate_amount(Decimal(amount))


def test_uc009_accepts_valid_amounts():
    for amount in ("0.000001", "10", "100"):
        dn.validate_amount(Decimal(amount))


@pytest.mark.parametrize("status", ["Pending", "Rejected", "Completed"])
def test_uc009_br001_only_verified_causes(status):
    with pytest.raises(ValueError, match="Verified"):
        dn.validate_cause(status, 10, OTHER, ME)


def test_uc009_requires_published_cause_and_a_different_recipient():
    with pytest.raises(ValueError, match="publicada"):
        dn.validate_cause("Verified", None, OTHER, ME)
    with pytest.raises(ValueError, match="misma"):
        dn.validate_cause("Verified", 10, ME.lower(), ME)
    dn.validate_cause("Verified", 10, OTHER, ME)


def test_uc014_console_snippet_posts_the_hash_with_the_users_own_session():
    snippet = dn.console_snippet("https://api.example/api/v1", 352, "0x" + "ab" * 32)
    assert "/causes/352/donations/confirm" in snippet and "0x" + "ab" * 32 in snippet
    assert 'localStorage.getItem("bbb_token")' in snippet
