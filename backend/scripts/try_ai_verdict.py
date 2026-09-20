"""Ensaya una foto real contra el modelo de visión ANTES de la demostración. No toca la BD ni la cadena.

Uso (desde backend/):
    python -m scripts.try_ai_verdict foto.jpg --description "El techo de mi comedor se cayó con las lluvias" [--runs 3]

Muestra el veredicto que recibiría la causa (verified, confianza, motivo) con las mismas reglas del agente:
solo se aprueba si el modelo la aprueba y la confianza es al menos 0.80 (UC-006 BR-002).
Cuesta unos centavos de OpenRouter por ejecución.
"""
import argparse
import asyncio
import sys
from pathlib import Path

from app.core.constants import AI_CONFIDENCE_THRESHOLD, AI_MODEL
from app.services.agent import VerificationUnavailable, verify_cause_with_ai

SIGNATURES = {"image/png": b"\x89PNG\r\n\x1a\n", "image/jpeg": b"\xff\xd8\xff"}
MAX_BYTES = 5 * 1024 * 1024


def detect_type(data: bytes) -> str | None:
    return next((kind for kind, magic in SIGNATURES.items() if data.startswith(magic)), None)


def load_image(path: Path) -> tuple[bytes, str]:
    """Aplica las mismas reglas que UC-005: JPEG o PNG de hasta 5 MB, y el contenido debe coincidir con el formato."""
    if not path.is_file():
        raise ValueError(f"No existe el archivo: {path}")
    data = path.read_bytes()
    if len(data) > MAX_BYTES:
        raise ValueError(f"La imagen pesa {len(data) / 1024 / 1024:.1f} MB; el máximo es 5 MB")
    kind = detect_type(data)
    if kind is None:
        raise ValueError("Solo se aceptan imágenes JPEG o PNG reales (el contenido no coincide)")
    return data, kind


async def run_once(data: bytes, kind: str, description: str) -> dict | None:
    try:
        return await verify_cause_with_ai(data, kind, description)
    except VerificationUnavailable as exc:
        print(f"   El modelo no entregó un veredicto válido: {exc}")
        return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("image", type=Path)
    parser.add_argument("--description", required=True, help="La descripción exacta de la causa (min. 20 caracteres)")
    parser.add_argument("--runs", type=int, default=1, help="Repeticiones para comprobar la consistencia (máx 5)")
    args = parser.parse_args(argv)
    if len(args.description) < 20:
        print("Error: la descripción debe tener al menos 20 caracteres, como en la API", file=sys.stderr)
        return 2
    try:
        data, kind = load_image(args.image)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2

    print(f"Modelo: {AI_MODEL} | umbral de confianza: {AI_CONFIDENCE_THRESHOLD} | imagen: {args.image.name} ({kind}, {len(data) // 1024} KB)")
    approved = 0
    runs = max(1, min(args.runs, 5))
    for i in range(runs):
        verdict = asyncio.run(run_once(data, kind, args.description))
        if verdict is None:
            continue
        ok = verdict["verified"]
        approved += ok
        print(f"{i + 1}. {'APROBADA' if ok else 'RECHAZADA'}  confianza={verdict['confidence']:.2f}  motivo: {verdict['reason']}")
    print(f"\nResultado: {approved}/{runs} aprobadas.")
    if approved < runs:
        print("Consejos: usa una foto real y clara del problema descrito, sin marcas de agua ni texto superpuesto, y una descripción "
              "que coincida con lo que se ve. Si la IA rechaza una foto legítima, prueba con otra antes de la demostración.")
    return 0 if approved == runs else 1


if __name__ == "__main__":
    sys.exit(main())
