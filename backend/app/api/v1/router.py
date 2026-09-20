# app/api/v1/router.py
# Agregador de rutas v1

from fastapi import APIRouter

from app.api.v1.endpoints import auth, causes, donations, users

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(causes.router)
router.include_router(donations.router)
router.include_router(users.router)

@router.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "block-by-block-backend"}
