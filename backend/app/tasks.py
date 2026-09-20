# app/tasks.py
# Cola de tareas de fondo de UC-006 (verificación asíncrona)
# ThreadPoolExecutor para el MVP (sin dependencias externas); ruta de escalamiento a Celery en TASKS.md

import asyncio
import logging
import threading
from concurrent.futures import ThreadPoolExecutor

from app.db import SessionLocal
from app.db.models import Cause, CauseStatus, Evidence
from app.services.agent import verify_cause_task

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="verify-cause-")
_inflight: set[int] = set()
_inflight_lock = threading.Lock()


def is_verifying(cause_id: int) -> bool:
    """UC-006 BR-007: ¿hay una verificación en curso para esta causa?"""
    with _inflight_lock:
        return cause_id in _inflight


def enqueue_verification(cause_id: int) -> bool:
    """
    Encola la verificación de una causa sin bloquear el endpoint (UC-006).

    Devuelve False si ya hay una en curso para la misma causa (UC-006 A8, BR-007).
    """
    with _inflight_lock:
        if cause_id in _inflight:
            logger.info("Verification already running for cause %s", cause_id)
            return False
        _inflight.add(cause_id)
    try:
        _executor.submit(_run_verification_task, cause_id)
    except Exception as exc:
        with _inflight_lock:
            _inflight.discard(cause_id)
        logger.error("Failed to queue verification for cause %s: %s", cause_id, exc)
        return False
    logger.info("Verification task queued for cause %s", cause_id)
    return True


def _run_verification_task(cause_id: int) -> None:
    """Ejecuta la tarea asíncrona del agente en un event loop propio del hilo."""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(verify_cause_task(cause_id))
        finally:
            loop.close()
    except Exception as exc:
        logger.error("Error in verification task for cause %s: %s", cause_id, exc)
    finally:
        with _inflight_lock:
            _inflight.discard(cause_id)


def resume_pending_verifications() -> list[int]:
    """
    UC-006 A7: al arrancar, reencola las causas Pending, publicadas y con evidencia
    (por ejemplo, si el servicio se reinició a mitad de una verificación).
    """
    db = SessionLocal()
    try:
        ids = [
            cause_id
            for (cause_id,) in db.query(Cause.id)
            .join(Evidence, Evidence.cause_id == Cause.id)
            .filter(Cause.status == CauseStatus.Pending.value, Cause.onchain_cause_id.isnot(None))
            .all()
        ]
    finally:
        db.close()
    queued = [cause_id for cause_id in ids if enqueue_verification(cause_id)]
    if queued:
        logger.info("Resumed verification for causes %s", queued)
    return queued


def shutdown_executor():
    """Detiene el thread pool (llamar en el apagado de la aplicación)."""
    _executor.shutdown(wait=True)
    logger.info("Verification executor shut down")
