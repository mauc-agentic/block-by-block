# agent.py
# Agente de verificación (UC-006): evalúa la evidencia con IA (OpenRouter),
# registra el veredicto en CauseVault y sincroniza el estado de la causa.

import asyncio
import base64
import hashlib
import json
import logging
import re
from typing import Optional

import httpx

from app.core import get_settings
from app.core.constants import AI_CONFIDENCE_THRESHOLD, AI_MODEL
from app.db import SessionLocal
from app.db.models import Cause, CauseStatus, Evidence, Verification
from app.services.chain import get_contract, get_w3

logger = logging.getLogger(__name__)
settings = get_settings()

MAX_AI_ATTEMPTS = 3      # NFR-004
AI_TIMEOUT_SECONDS = 30  # NFR-004
TX_RECEIPT_TIMEOUT = 60  # NFR-003
MAX_TX_ATTEMPTS = 3      # UC-006 A5


class VerificationUnavailable(Exception):
    """El proveedor de IA no entregó un veredicto válido (UC-006 A3/A4)."""


def _build_prompt(description: str) -> str:
    return f"""Eres un verificador de causas de ayuda comunitaria.

Descripción de la causa:
{description}

Analiza la imagen adjunta y responde SOLO con JSON válido (sin markdown):
{{"verified": true o false, "confidence": número entre 0.0 y 1.0, "reason": "explicación breve (máx 100 caracteres)"}}

Preguntas a responder:
1. ¿Hay evidencia visual real del problema o la necesidad?
2. ¿La imagen corresponde a la descripción?
3. ¿Parece una solicitud legítima o potencialmente fraudulenta?"""


def _parse_verdict(content: str) -> dict:
    """Extrae y valida el veredicto JSON de la respuesta del modelo (UC-006 A4)."""
    text = content.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    elif not text.startswith("{"):
        braces = re.search(r"\{.*\}", text, re.DOTALL)
        text = braces.group(0) if braces else text
    try:
        verdict = json.loads(text)
        verified = verdict["verified"]
        confidence = float(verdict["confidence"])
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        raise VerificationUnavailable(f"invalid verdict: {exc}") from exc
    if not isinstance(verified, bool) or not 0.0 <= confidence <= 1.0:
        raise VerificationUnavailable("verdict out of range")
    return {
        "verified": verified,
        "confidence": confidence,
        "reason": str(verdict.get("reason", ""))[:500],
    }


async def verify_cause_with_ai(image_bytes: bytes, content_type: str, description: str) -> dict:
    """
    UC-006: Evalúa la evidencia con el modelo de visión.

    BR-002: verified solo si el modelo lo afirma y la confianza >= 0.80.
    Lanza VerificationUnavailable si el proveedor falla o responde algo ilegible
    tras 3 intentos; en ese caso la causa debe permanecer Pending (no se rechaza).
    """
    data_url = f"data:{content_type};base64,{base64.b64encode(image_bytes).decode()}"
    payload = {
        "model": AI_MODEL,
        "temperature": 0,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": data_url}},
                {"type": "text", "text": _build_prompt(description)},
            ],
        }],
    }
    headers = {"Authorization": f"Bearer {settings.openrouter_api_key}"}

    last_error: Exception = VerificationUnavailable("no attempts")
    for attempt in range(MAX_AI_ATTEMPTS):
        try:
            async with httpx.AsyncClient(timeout=AI_TIMEOUT_SECONDS) as client:
                response = await client.post(settings.openrouter_url, json=payload, headers=headers)
            response.raise_for_status()
            verdict = _parse_verdict(response.json()["choices"][0]["message"]["content"])
            if verdict["confidence"] < AI_CONFIDENCE_THRESHOLD:
                verdict["verified"] = False
            return verdict
        except (httpx.HTTPError, KeyError, IndexError, ValueError, VerificationUnavailable) as exc:
            last_error = exc
            logger.warning("UC-006: AI attempt %s/%s failed: %s", attempt + 1, MAX_AI_ATTEMPTS, exc)
            if attempt < MAX_AI_ATTEMPTS - 1:
                await asyncio.sleep(2 ** attempt)
    raise VerificationUnavailable(str(last_error))


def compute_verification_hash(verdict: dict) -> str:
    """Huella SHA-256 del análisis, registrada on-chain para auditoría (UC-006 BR-004)."""
    canonical = json.dumps(verdict, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


def sign_verification_tx(onchain_cause_id: int, verified: bool, verification_hash: str) -> Optional[str]:
    """
    UC-006: Firma y envía `verifyCause` con la llave del agente (BR-001, BR-003).

    Devuelve el hash de la tx solo si el recibo confirma éxito; None en cualquier otro caso.
    """
    try:
        w3 = get_w3()
        if not w3.is_connected():
            logger.error("UC-006: HSK RPC not reachable")
            return None

        contract = get_contract(w3)
        account = w3.eth.account.from_key(settings.agent_private_key)
        if account.address.lower() != settings.agent_address.lower():
            logger.error("UC-006: AGENT_PRIVATE_KEY does not match AGENT_ADDRESS")
            return None

        tx = contract.functions.verifyCause(
            onchain_cause_id, verified, verification_hash
        ).build_transaction({
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gasPrice": w3.eth.gas_price,
            "gas": 200000,
            "chainId": settings.hsk_chain_id,
        })
        signed = w3.eth.account.sign_transaction(tx, settings.agent_private_key)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=TX_RECEIPT_TIMEOUT)
        if receipt.status != 1:
            logger.error("UC-006: verifyCause reverted, tx %s", w3.to_hex(tx_hash))
            return None
        return w3.to_hex(tx_hash)
    except Exception as exc:
        logger.error("UC-006: verifyCause failed: %s", exc)
        return None


async def verify_cause_task(cause_id: int) -> None:
    """
    UC-006: Verifica una causa y sincroniza su estado.

    BR-005: la causa pasa a Verified/Rejected en la plataforma solo después de que el
    veredicto quedó confirmado on-chain. Cualquier fallo previo la deja Pending.
    """
    db = SessionLocal()
    try:
        cause = db.query(Cause).filter(Cause.id == cause_id).first()
        if cause is None or cause.status != CauseStatus.Pending.value:
            logger.info("UC-006: cause %s missing or not Pending, skipping", cause_id)
            return
        if cause.onchain_cause_id is None:
            logger.info("UC-006: cause %s not published on-chain yet, skipping", cause_id)
            return
        evidence = db.query(Evidence).filter(Evidence.cause_id == cause_id).first()
        if evidence is None:
            logger.info("UC-006 BR-006: cause %s has no evidence, skipping", cause_id)
            return

        try:
            verdict = await verify_cause_with_ai(evidence.data, evidence.content_type, cause.description)
        except VerificationUnavailable as exc:
            logger.error("UC-006 A3: cause %s stays Pending, AI unavailable: %s", cause_id, exc)
            return

        verification_hash = compute_verification_hash(verdict)
        record = db.query(Verification).filter(Verification.cause_id == cause_id).first()
        if record is None:
            record = Verification(cause_id=cause_id)
            db.add(record)
        record.verified = verdict["verified"]
        record.confidence = verdict["confidence"]
        record.reason = verdict["reason"]
        record.tx_hash = None
        db.commit()

        tx_hash = None
        for attempt in range(MAX_TX_ATTEMPTS):
            tx_hash = await asyncio.to_thread(
                sign_verification_tx, cause.onchain_cause_id, verdict["verified"], verification_hash
            )
            if tx_hash:
                break
            await asyncio.sleep(2 ** attempt)
        if not tx_hash:
            logger.error("UC-006 A5: cause %s stays Pending, on-chain registration failed", cause_id)
            return

        record.tx_hash = tx_hash
        cause.verification_hash = verification_hash
        cause.status = CauseStatus.Verified.value if verdict["verified"] else CauseStatus.Rejected.value
        db.commit()
        logger.info("UC-006: cause %s -> %s (tx %s)", cause_id, cause.status, tx_hash)
    except Exception as exc:
        db.rollback()
        logger.error("UC-006: unexpected error verifying cause %s: %s", cause_id, exc)
    finally:
        db.close()
