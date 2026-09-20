# Script scripts/fund_wallet.py: validaciones (sin red)

from decimal import Decimal

import pytest

from scripts import fund_wallet as fw

ADDR = "0x4fd6a9d0c1f0bA6f6d7C1e2b3a4F5e6D7c8bf999"


class TestValidateAmounts:
    def test_accepts_usdt_and_hsk_within_limits(self):
        fw.validate_amounts(Decimal("100"), Decimal("0.01"))

    @pytest.mark.parametrize("usdt,hsk", [(0, 0), (-1, 0), (0, -0.01), (1001, 0), (0, 0.06)])
    def test_rejects_zero_negative_and_above_limits(self, usdt, hsk):
        with pytest.raises(ValueError):
            fw.validate_amounts(Decimal(str(usdt)), Decimal(str(hsk)))


class TestResolveTarget:
    def test_explicit_address_is_checksummed(self):
        assert fw.resolve_target(ADDR.lower(), None) == fw.Web3.to_checksum_address(ADDR.lower())

    def test_requires_exactly_one_of_address_or_user(self):
        for args in ((None, None), (ADDR, "carlos")):
            with pytest.raises(ValueError):
                fw.resolve_target(*args)

    def test_rejects_invalid_address(self):
        with pytest.raises(ValueError):
            fw.resolve_target("0x123", None)

    def test_user_lookup_needs_exactly_one_match(self):
        one = lambda q: [("carlos andres", ADDR)]
        assert fw.resolve_target(None, "carlos", lookup=one) == fw.Web3.to_checksum_address(ADDR)
        for matches in ([], [("a", ADDR), ("b", ADDR)]):
            with pytest.raises(ValueError):
                fw.resolve_target(None, "x", lookup=lambda q, m=matches: m)
