# Background Tasks — Block by Block

## Current Implementation

**Framework:** ThreadPoolExecutor (Python stdlib)  
**Status:** MVP-ready, production-tested at ≤10 concurrent tasks  
**Task:** UC-006 verification (async AI analysis + on-chain signing)

### Architecture

```
[POST /upload-image]
     ↓
enqueue_verification(cause_id)
     ↓
_executor.submit(_run_verification_task)
     ↓
[ThreadPool Worker] → verify_cause_task() → DB + blockchain
     ↓
[Response returned to client immediately]
```

### Key Features

- **Nonce seguro:** `sign_verification_tx` usa el nonce `pending` y un bloqueo (`_tx_lock`) al firmar/enviar, para que varias verificaciones simultáneas no choquen.
- **Reinicios:** la cola es en memoria, pero al arrancar `resume_pending_verifications()` reencola las causas Pending, publicadas y con evidencia (UC-006 A7), y `POST /causes/{id}/verify` permite al titular reintentar (A6). `_inflight` evita dos verificaciones simultáneas de la misma causa (BR-007).
- **Non-blocking:** Upload endpoint returns `202 Accepted` immediately
- **Retries:** Built-in exponential backoff (2^attempt seconds, max 3 attempts)
- **Error handling:** Failed tasks logged, cause remains `Pending`
- **Graceful shutdown:** `@app.on_event("shutdown")` waits for in-flight tasks
- **No external dependencies:** Runs locally without Redis/Celery server

## Migration to Celery (Production)

For high throughput (>10 concurrent verifications), migrate to Celery + Redis:

### Step 1: Install Celery + Redis

```bash
pip install celery redis
```

### Step 2: Create `app/celery_app.py`

```python
from celery import Celery
from app.core import get_settings

settings = get_settings()

celery_app = Celery(
    "block_by_block",
    broker=settings.celery_broker_url or "redis://localhost:6379/0",
    backend=settings.celery_result_backend or "redis://localhost:6379/1"
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,
    task_soft_time_limit=3300,
)
```

### Step 3: Replace `app/tasks.py`

```python
from app.celery_app import celery_app
from app.services.agent import verify_cause_task

@celery_app.task(bind=True, autoretry_for=(Exception,), retry_kwargs={"max_retries": 3})
def verify_cause_background(self, cause_id: int):
    """Celery task wrapper for UC-006."""
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(verify_cause_task(cause_id))
    finally:
        loop.close()

def enqueue_verification(cause_id: int):
    verify_cause_background.delay(cause_id)
```

### Step 4: Run Celery Worker

```bash
celery -A app.celery_app worker --loglevel=info
```

### Step 5: Update `.env`

```bash
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

## Monitoring

### Current (ThreadPoolExecutor)

- Tasks logged to `app/logs/` (if configured)
- Check `Verification.tx_hash` to confirm on-chain registration

### Celery

```bash
celery -A app.celery_app events
celery -A app.celery_app inspect active
celery -A app.celery_app inspect stats
```

## Known Limitations

### Current (ThreadPoolExecutor)

- **Max workers:** 4 (hardcoded, tune via `_executor`)
- **Task persistence:** None (tasks lost on server restart)
- **Distributed:** Cannot scale across multiple servers
- **Monitoring:** Basic logging only

### Solution

Upgrade to Celery for:
- Persistent task queue (survives restarts)
- Horizontal scaling (multiple workers)
- Flower monitoring dashboard
- Task rate limiting
- Priority queues

## Testing

```bash
# Simulate verification task
pytest tests/unit/test_agent.py::test_verify_cause_with_ai

# Integration test (with mock)
pytest tests/integration/test_causes.py::test_upload_image_queues_verification
```

## Troubleshooting

### Task not running

Check `/Users/miguelangeluribecastaneda/Desktop/block-by-block/backend/app.log`:

```bash
grep "Verification task queued" app.log
grep "Error verifying cause" app.log
```

### Task hangs

Timeout is 30s per attempt, max 3 retries = 90s total. If blocking:
- Check OpenRouter API status
- Check HSK RPC connectivity
- Increase `verify_cause_with_ai` timeout if network is slow

### Cause stuck in Pending

Manually retry via admin endpoint (TBD):

```bash
POST /api/v1/admin/causes/{cause_id}/verify --json '{"retry": true}'
```
