# tests/unit/test_utils.py
# Utilidades de conversión de moneda y hash

import pytest
from decimal import Decimal


def test_calculate_image_hash():
    """Test SHA-256 hash calculation for images."""
    from app.utils.helpers import calculate_image_hash

    content = b"test image data"
    hash_result = calculate_image_hash(content)

    assert isinstance(hash_result, str)
    assert len(hash_result) == 10  # 10 caracteres del hash

    # Same content = same hash
    hash_result2 = calculate_image_hash(content)
    assert hash_result == hash_result2


def test_calculate_image_hash_different_content():
    """Diferentes contenidos producen diferentes hashes."""
    from app.utils.helpers import calculate_image_hash

    hash1 = calculate_image_hash(b"image1")
    hash2 = calculate_image_hash(b"image2")

    assert hash1 != hash2


def test_convert_usdt_to_wei():
    """Convierte USDT (6 decimales) a wei (entero)."""
    from app.utils.helpers import convert_usdt_to_wei

    # 1 USDT = 1,000,000 wei
    result = convert_usdt_to_wei(Decimal("1"))
    assert result == 1_000_000

    # 0.5 USDT = 500,000 wei
    result = convert_usdt_to_wei(Decimal("0.5"))
    assert result == 500_000

    # 100 USDT = 100,000,000 wei
    result = convert_usdt_to_wei(Decimal("100"))
    assert result == 100_000_000


def test_convert_usdt_to_wei_zero():
    """Convierte cero USDT a cero wei."""
    from app.utils.helpers import convert_usdt_to_wei

    result = convert_usdt_to_wei(Decimal("0"))
    assert result == 0


def test_convert_usdt_to_wei_small_amounts():
    """Maneja cantidades pequeñas correctamente."""
    from app.utils.helpers import convert_usdt_to_wei

    # 0.000001 USDT = 1 wei (mínima unidad)
    result = convert_usdt_to_wei(Decimal("0.000001"))
    assert result == 1

    # 0.1 USDT = 100,000 wei
    result = convert_usdt_to_wei(Decimal("0.1"))
    assert result == 100_000


def test_convert_wei_to_usdt():
    """Convierte wei (entero) a USDT (6 decimales)."""
    from app.utils.helpers import convert_wei_to_usdt

    # 1,000,000 wei = 1 USDT
    result = convert_wei_to_usdt(1_000_000)
    assert result == Decimal("1")

    # 500,000 wei = 0.5 USDT
    result = convert_wei_to_usdt(500_000)
    assert result == Decimal("0.5")

    # 100,000,000 wei = 100 USDT
    result = convert_wei_to_usdt(100_000_000)
    assert result == Decimal("100")


def test_convert_wei_to_usdt_zero():
    """Convierte cero wei a cero USDT."""
    from app.utils.helpers import convert_wei_to_usdt

    result = convert_wei_to_usdt(0)
    assert result == Decimal("0")


def test_convert_wei_to_usdt_small_amounts():
    """Maneja cantidades pequeñas correctamente."""
    from app.utils.helpers import convert_wei_to_usdt

    # 1 wei = 0.000001 USDT
    result = convert_wei_to_usdt(1)
    assert result == Decimal("0.000001")

    # 100,000 wei = 0.1 USDT
    result = convert_wei_to_usdt(100_000)
    assert result == Decimal("0.1")


def test_convert_roundtrip():
    """Roundtrip: USDT → wei → USDT debe ser idéntico."""
    from app.utils.helpers import convert_usdt_to_wei, convert_wei_to_usdt

    original = Decimal("12.345")

    wei = convert_usdt_to_wei(original)
    result = convert_wei_to_usdt(wei)

    assert result == original
