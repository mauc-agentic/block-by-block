import hashlib
import re
import unicodedata
from decimal import Decimal
from eth_account import Account
from eth_account.messages import encode_defunct
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

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

def verify_google_id_token(token: str, client_id: str) -> dict:
    """
    Verifica un ID token de Google Identity Services (UC-001 A3, UC-002 A3).

    Valida la firma, el emisor y que la audiencia coincida con nuestro Client ID.

    Args:
        token: ID token JWT emitido por Google (credential de Google Identity Services).
        client_id: OAuth 2.0 Client ID configurado en Google Cloud Console.

    Returns:
        dict con "external_id" (sub), "email" y "name" del perfil verificado.

    Raises:
        ValueError: si el token es inválido, expiró o la audiencia no coincide.
    """
    payload = google_id_token.verify_oauth2_token(
        token, google_requests.Request(), client_id
    )

    if payload.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValueError("Invalid issuer")
    if not payload.get("email_verified", False):
        raise ValueError("Email not verified by Google")

    return {
        "external_id": payload["sub"],
        "email": payload["email"],
        "name": payload.get("name") or payload["email"].split("@")[0],
    }

def derive_username(seed: str) -> str:
    """UC-001 BR-004: deriva un nombre de usuario válido a partir de un perfil externo."""
    normalized = unicodedata.normalize("NFKD", seed).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "", normalized).lower()
    return slug[:100] or "usuario"
