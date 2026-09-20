# app/tasks.py
# Background task queue for UC-006 (async verification)
# Uses ThreadPoolExecutor for MVP (no external dependencies)

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from app.db import SessionLocal
from app.services.agent import verify_cause_task

logger = logging.getLogger(__name__)

# Singleton thread pool for background tasks
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="verify-cause-")

def enqueue_verification(cause_id: int):
    """
    Encola una tarea de verificación de causa.

    UC-006: Verifica causa asincronamente sin bloquear el endpoint.

    Nota: Para producción, reemplazar con Celery + Redis.

    Args:
        cause_id: ID de la causa a verificar
    """
    try:
        # Enviar tarea al thread pool
        _executor.submit(_run_verification_task, cause_id)
        logger.info(f"Verification task queued for cause {cause_id}")
    except Exception as e:
        logger.error(f"Failed to queue verification for cause {cause_id}: {str(e)}")

def _run_verification_task(cause_id: int):
    """
    Wrapper sincrónico que ejecuta la tarea asincrónica en el thread pool.

    Args:
        cause_id: ID de la causa a verificar
    """
    try:
        # Crear un nuevo event loop para el thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(verify_cause_task(cause_id))
        finally:
            loop.close()
    except Exception as e:
        logger.error(f"Error in verification task for cause {cause_id}: {str(e)}")

def shutdown_executor():
    """Detiene el thread pool (llamar en shutdown de aplicación)."""
    _executor.shutdown(wait=True)
    logger.info("Verification executor shut down")
