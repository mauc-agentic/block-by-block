import hashlib
from decimal import Decimal

def calculate_image_hash(content: bytes) -> str:
    """Calcula hash SHA-256 de una imagen (simula IPFS)."""
    return hashlib.sha256(content).hexdigest()[:10]

def convert_usdt_to_wei(amount: Decimal) -> int:
    """Convierte USDT (6 decimales) a wei (entero)."""
    return int(amount * (10 ** 6))

def convert_wei_to_usdt(amount_wei: int) -> Decimal:
    """Convierte wei a USDT."""
    return Decimal(amount_wei) / (10 ** 6)
