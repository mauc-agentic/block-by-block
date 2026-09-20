# app/main.py
# FastAPI application factory

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core import get_settings
from app.api.v1.router import router as v1_router
from app.db import Base, engine

# Crear tablas
Base.metadata.create_all(bind=engine)

settings = get_settings()

# Crear app
app = FastAPI(
    title="Block by Block API",
    description="Plataforma de donaciones descentralizada peer-to-peer",
    version="0.1.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(v1_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port)
