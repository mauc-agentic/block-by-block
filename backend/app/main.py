# app/main.py
# FastAPI application factory

import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core import get_settings
from app.api.v1.router import router as v1_router
from app.tasks import resume_pending_verifications, shutdown_executor

settings = get_settings()

# Crear app
app = FastAPI(
    title="Block by Block API",
    description="Plataforma de donaciones descentralizada peer-to-peer",
    version="0.1.0",
)

# Crear tablas solo si no estamos en tests
if "pytest" not in sys.modules:
    from app.db import Base
    from app.db.session import engine
    Base.metadata.create_all(bind=engine)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(v1_router)

# UC-006 A7: retomar verificaciones interrumpidas por un reinicio (no en pruebas)
@app.on_event("startup")
def on_startup():
    if "pytest" not in sys.modules:
        resume_pending_verifications()

# Shutdown hook para background tasks
@app.on_event("shutdown")
def on_shutdown():
    """Limpieza de recursos al apagar la aplicación."""
    shutdown_executor()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port)
