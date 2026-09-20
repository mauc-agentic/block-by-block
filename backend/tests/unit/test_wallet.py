# tests/unit/test_wallet.py
# UC-003: Validación de firma de wallet (BR-001)

import pytest
from eth_account import Account
from eth_account.messages import encode_defunct
from app.utils.helpers import verify_wallet_signature


class TestWalletSignatureValidation:
    """Tests para verificación de firma de wallet."""

    @pytest.fixture
    def wallet(self):
        """Crea una wallet de prueba con clave privada."""
        acct = Account.create()
        return {
            "address": acct.address,
            "private_key": acct.key,
            "account": acct
        }

    def test_uc003_br001_valid_signature_proves_ownership(self, wallet):
        """BR-001: Valida una firma correcta."""
        message = "Link wallet to Block by Block — 2026-09-20T10:30:00Z"

        # Firmar mensaje con la clave privada
        msg = encode_defunct(text=message)
        signed_msg = wallet["account"].sign_message(msg)

        # Verificar firma
        result = verify_wallet_signature(
            message=message,
            signature=signed_msg.signature.hex(),
            wallet_address=wallet["address"]
        )

        assert result is True

    def test_uc003_a1_invalid_signature_wrong_message(self, wallet):
        """BR-001: Rechaza firma para mensaje diferente."""
        message1 = "Link wallet to Block by Block — 2026-09-20T10:30:00Z"
        message2 = "Link wallet to Block by Block — 2026-09-20T10:31:00Z"

        # Firmar con mensaje1
        msg = encode_defunct(text=message1)
        signed_msg = wallet["account"].sign_message(msg)

        # Intentar verificar con mensaje2
        result = verify_wallet_signature(
            message=message2,
            signature=signed_msg.signature.hex(),
            wallet_address=wallet["address"]
        )

        assert result is False

    def test_uc003_a1_invalid_signature_wrong_address(self, wallet):
        """BR-001: Rechaza firma para dirección diferente."""
        message = "Link wallet to Block by Block — 2026-09-20T10:30:00Z"

        # Firmar con wallet1
        msg = encode_defunct(text=message)
        signed_msg = wallet["account"].sign_message(msg)

        # Intentar verificar con wallet2 diferente
        wallet2 = Account.create()
        result = verify_wallet_signature(
            message=message,
            signature=signed_msg.signature.hex(),
            wallet_address=wallet2.address
        )

        assert result is False

    def test_uc003_a1_invalid_signature_malformed(self, wallet):
        """BR-001: Rechaza firma malformada."""
        message = "Link wallet to Block by Block — 2026-09-20T10:30:00Z"
        malformed_sig = "0x" + "00" * 65  # Firma inválida

        result = verify_wallet_signature(
            message=message,
            signature=malformed_sig,
            wallet_address=wallet["address"]
        )

        assert result is False

    def test_uc003_br001_case_insensitive_address(self, wallet):
        """BR-001: Validar firma es case-insensitive para direcciones."""
        message = "Link wallet to Block by Block — 2026-09-20T10:30:00Z"

        msg = encode_defunct(text=message)
        signed_msg = wallet["account"].sign_message(msg)

        # Probar con dirección en mayúsculas
        result = verify_wallet_signature(
            message=message,
            signature=signed_msg.signature.hex(),
            wallet_address=wallet["address"].upper()
        )

        assert result is True
