# agent.py
# Agente de verificación (UC-006)
# Verifica causas con OpenRouter + firma resultado en el contrato

import httpx
import json
import base64
import asyncio
import os
import hashlib
from typing import Optional
from web3 import Web3
from web3.contract import Contract
from app.core import get_settings
from app.db import SessionLocal
from app.db.models import Cause, Verification, CauseStatus
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

# ============================================================================
# VERIFICACIÓN CON IA (OpenRouter)
# ============================================================================

async def verify_cause_with_ai(
    cause_id: int,
    image_base64: str,
    description: str,
    db: Session
) -> dict:
    """
    UC-006: Verifica una causa con visión de IA via OpenRouter.
    
    Workflow:
    1. Llama a OpenRouter con imagen + descripción
    2. Recibe veredicto (verified, confidence, reason)
    3. Guarda resultado en BD
    4. Firma el resultado on-chain (verifyCause)
    
    Business Rules:
    - BR-001: Solo el agente (AGENT_ADDRESS)
    - BR-002: Umbral de confianza >= 0.80
    - BR-003: IPFS hash del análisis para auditoría
    - BR-004: Llave privada solo en variables de entorno
    
    Args:
        cause_id: ID de la causa a verificar
        image_base64: Imagen en base64
        description: Descripción de la causa
        db: Sesión de BD
    
    Returns:
        {"verified": bool, "confidence": float, "reason": str}
    """
    
    cause = db.query(Cause).filter(Cause.id == cause_id).first()
    if not cause:
        raise ValueError(f"Cause {cause_id} not found")
    
    # Prompt para el modelo
    prompt = f"""Eres un verificador de causas de ayuda comunitaria.

Descripción de la causa:
{description}

Analiza la imagen adjunta. Responde SOLO en JSON válido (sin markdown, sin código):
{{
    "verified": true o false,
    "confidence": 0.0 a 1.0,
    "reason": "explicación breve (máx 100 caracteres)"
}}

Preguntas a responder:
1. ¿Hay evidencia visual real del problema/necesidad?
2. ¿La imagen corresponde a la descripción?
3. ¿Parece una solicitud legítima o potencialmente fraudulenta?

Responde SOLO el JSON."""

    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "deepseek/deepseek-v4.1-flash",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_base64
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ],
        "temperature": 0  # Determinístico para verificación
    }
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    settings.openrouter_url,
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
                break
        except httpx.TimeoutException:
            if attempt == max_retries - 1:
                logger.error(f"OpenRouter timeout after {max_retries} retries for cause {cause_id}")
                return {
                    "verified": False,
                    "confidence": 0.0,
                    "reason": "Verification service timeout"
                }
            await asyncio.sleep(2 ** attempt)  # Backoff exponencial
        except Exception as e:
            if attempt == max_retries - 1:
                logger.error(f"OpenRouter error: {str(e)}")
                return {
                    "verified": False,
                    "confidence": 0.0,
                    "reason": f"Verification error: {str(e)}"
                }
            await asyncio.sleep(2 ** attempt)
    
    # Parsear respuesta
    try:
        content = result['choices'][0]['message']['content']
        verification = json.loads(content)
    except (json.JSONDecodeError, KeyError) as e:
        logger.error(f"Failed to parse OpenRouter response: {str(e)}")
        return {
            "verified": False,
            "confidence": 0.0,
            "reason": "Invalid response from verification service"
        }
    
    # Validar estructura
    if not isinstance(verification, dict) or "verified" not in verification:
        logger.error(f"Invalid verification structure: {verification}")
        return {
            "verified": False,
            "confidence": 0.0,
            "reason": "Invalid verification response format"
        }
    
    # Aplicar umbral (BR-002)
    confidence = float(verification.get("confidence", 0.0))
    if confidence < 0.80:
        verification["verified"] = False
    
    return verification

# ============================================================================
# FIRMA ON-CHAIN (verifyCause)
# ============================================================================

def sign_verification_tx(
    cause_id: int,
    verified: bool,
    verification_hash: str,
    db: Session
) -> Optional[str]:
    """
    UC-006: Firma la transacción verifyCause en el contrato.
    
    Business Rules:
    - BR-001: Solo el agente firmante
    - BR-003: Hash IPFS del análisis
    - BR-004: Llave privada solo en variables de entorno
    
    Args:
        cause_id: ID de la causa
        verified: Resultado de la verificación
        verification_hash: Hash IPFS del análisis
        db: Sesión de BD
    
    Returns:
        tx_hash: Hash de la transacción on-chain
    """
    
    try:
        # Conectar a la red
        w3 = Web3(Web3.HTTPProvider(settings.hsk_rpc_url))
        
        if not w3.is_connected():
            logger.error(f"Failed to connect to HSK RPC: {settings.hsk_rpc_url}")
            return None
        
        # Cargar ABI del contrato
        abi_path = "abi/CauseVault.json"
        if not os.path.exists(abi_path):
            logger.error(f"ABI file not found: {abi_path}")
            return None
        
        with open(abi_path) as f:
            abi = json.load(f)
        
        # Instanciar contrato
        contract = w3.eth.contract(
            address=w3.to_checksum_address(settings.cause_vault_address),
            abi=abi
        )
        
        # Preparar firma
        agent_address = w3.to_checksum_address(settings.agent_address)
        agent_pk = settings.agent_private_key
        
        account = w3.eth.account.from_key(agent_pk)
        assert account.address.lower() == agent_address.lower()
        
        # Construir tx
        nonce = w3.eth.get_transaction_count(agent_address)
        gas_price = w3.eth.gas_price
        
        tx = contract.functions.verifyCause(
            cause_id,
            verified,
            verification_hash
        ).build_transaction({
            'from': agent_address,
            'nonce': nonce,
            'gasPrice': gas_price,
            'gas': 200000,
            'chainId': settings.hsk_chain_id
        })
        
        # Firmar y enviar
        signed_tx = w3.eth.account.sign_transaction(tx, agent_pk)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # Esperar confirmación (max 30 segundos)
        try:
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
            logger.info(f"UC-006: verifyCause confirmed for cause {cause_id}, tx: {tx_hash.hex()}")
            return tx_hash.hex()
        except Exception as e:
            logger.warning(f"UC-006: tx sent but not confirmed in time: {tx_hash.hex()}, error: {str(e)}")
            return tx_hash.hex()  # Retornar hash aunque no esté confirmado
    
    except Exception as e:
        logger.error(f"UC-006: Failed to sign verification tx: {str(e)}")
        return None

# ============================================================================
# BACKGROUND TASK (encolable con Celery)
# ============================================================================

async def verify_cause_task(cause_id: int):
    """
    Tarea encolable que:
    1. Obtiene la imagen y descripción de la causa
    2. Verifica con IA (UC-006)
    3. Registra resultado on-chain
    
    Uso (con Celery):
        from tasks import verify_cause_task
        verify_cause_task.delay(cause_id)
    """
    
    db = SessionLocal()
    try:
        cause = db.query(Cause).filter(Cause.id == cause_id).first()
        
        if not cause:
            logger.error(f"UC-006: Cause {cause_id} not found")
            return
        
        if not cause.image_hash:
            logger.error(f"UC-006: Cause {cause_id} has no image")
            return
        
        # TODO: Obtener imagen desde IPFS o almacenamiento
        # image_base64 = get_image_from_ipfs(cause.image_hash)
        
        # Simular (en prod, obtener de IPFS)
        logger.info(f"UC-006: Verifying cause {cause_id} with description: {cause.description[:50]}...")
        image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        
        # Verificar con IA
        verification = await verify_cause_with_ai(cause_id, image_base64, cause.description, db)
        
        # Calcular hash IPFS del análisis (simulado)
        analysis_json = json.dumps(verification)
        verification_hash = "Qm" + hashlib.sha256(analysis_json.encode()).hexdigest()[:10]
        
        # Guardar resultado en BD
        db_verification = Verification(
            cause_id=cause_id,
            verified=verification.get("verified", False),
            confidence=verification.get("confidence", 0.0),
            reason=verification.get("reason", ""),
        )
        db.add(db_verification)
        db.commit()
        
        # Firmar on-chain
        tx_hash = sign_verification_tx(
            cause_id,
            verification.get("verified", False),
            verification_hash,
            db
        )
        
        if tx_hash:
            db_verification.tx_hash = tx_hash
            db.commit()
            logger.info(f"UC-006: Cause {cause_id} verified and registered on-chain: {tx_hash}")
        else:
            logger.error(f"UC-006: Failed to register verification on-chain for cause {cause_id}")
    
    except Exception as e:
        logger.error(f"UC-006: Error verifying cause {cause_id}: {str(e)}")
    finally:
        db.close()

# ============================================================================
# CLI (para testing)
# ============================================================================

if __name__ == "__main__":
    import asyncio
    
    # Test: python -m backend.agent
    # asyncio.run(verify_cause_task(1))
    
    print("Agent module loaded. Use verify_cause_task(cause_id) to verify causes.")
