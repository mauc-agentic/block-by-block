import hashlib
from decimal import Decimal
from eth_account import Account
from eth_account.messages import encode_defunct

def calculate_image_hash(content: bytes) -> str:
    """Calcula hash SHA-256 de una imagen (simula IPFS)."""
    return hashlib.sha256(content).hexdigest()[:10]

def convert_usdt_to_wei(amount: Decimal) -> int:
    """Convierte USDT (6 decimales) a wei (entero)."""
    return int(amount * (10 ** 6))

def convert_wei_to_usdt(amount_wei: int) -> Decimal:
    """Convierte wei a USDT."""
    return Decimal(amount_wei) / (10 ** 6)

def verify_wallet_signature(message: str, signature: str, wallet_address: str) -> bool:
    """
    Verifica que una firma corresponde a una dirección de wallet.

    BR-001: Prueba de propiedad — valida que el usuario controla la wallet.

    Args:
        message: Mensaje original que fue firmado
        signature: Firma en formato 0x... (65 bytes, 130 caracteres hex)
        wallet_address: Dirección esperada (0x...)

    Returns:
        True si la firma es válida para la dirección, False en caso contrario.
    """
    try:
        # Recuperar dirección del mensaje firmado
        msg = encode_defunct(text=message)
        recovered_address = Account.recover_message(msg, signature=signature)

        # Comparar direcciones (normalizadas a minúsculas)
        return recovered_address.lower() == wallet_address.lower()
    except Exception:
        # Si hay error en recuperación, la firma es inválida
        return False
