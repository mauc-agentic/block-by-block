# scripts/try_ai_verdict.py: validaciones de la imagen (sin red)

import pytest

from scripts import try_ai_verdict as tv

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 16


def test_uc005_accepts_png_and_jpeg_by_content(tmp_path):
    (tmp_path / "a.bin").write_bytes(PNG)
    (tmp_path / "b.bin").write_bytes(JPG)
    assert tv.load_image(tmp_path / "a.bin")[1] == "image/png"
    assert tv.load_image(tmp_path / "b.bin")[1] == "image/jpeg"


@pytest.mark.parametrize("content,message", [(b"GIF89a....", "JPEG o PNG"), (b"no es una imagen", "JPEG o PNG")])
def test_uc005_a1_rejects_other_formats(tmp_path, content, message):
    (tmp_path / "x.png").write_bytes(content)
    with pytest.raises(ValueError, match=message):
        tv.load_image(tmp_path / "x.png")


def test_uc005_rejects_missing_file_and_oversize(tmp_path):
    with pytest.raises(ValueError, match="No existe"):
        tv.load_image(tmp_path / "nada.png")
    (tmp_path / "big.png").write_bytes(PNG + b"\x00" * tv.MAX_BYTES)
    with pytest.raises(ValueError, match="5 MB"):
        tv.load_image(tmp_path / "big.png")
