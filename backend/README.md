# Block by Block Backend

Plataforma de donaciones descentralizada peer-to-peer.

## Stack

- **Framework**: FastAPI
- **BD**: Supabase (PostgreSQL)
- **Auth**: JWT + bcrypt
- **IA**: OpenRouter (Claude 3.5 Sonnet)
- **Blockchain**: web3.py + Solidity (HSK Chain testnet)

## Estructura del proyecto

```
app/
├── main.py                  # Punto de entrada FastAPI
├── core/                    # Configuración y seguridad
│   ├── config.py           # Settings (.env)
│   ├── security.py         # JWT, bcrypt, autenticación
│   └── constants.py        # Constantes globales
├── api/v1/                 # API v1
│   ├── endpoints/
│   │   ├── auth.py         # UC-001, UC-002, UC-003
│   │   ├── causes.py       # UC-004, UC-007, UC-008, UC-011
│   │   └── donations.py    # UC-005, UC-009
│   └── router.py           # Agregador de rutas
├── db/                     # Base de datos
│   ├── models/             # SQLAlchemy models
│   └── session.py          # SessionLocal, get_db()
├── schemas/                # Pydantic models (validación)
├── services/               # Lógica de negocio
│   ├── auth.py
│   ├── cause.py
│   ├── donation.py
│   └── agent.py            # UC-006 (OpenRouter)
├── utils/                  # Utilidades
│   ├── logger.py
│   ├── exceptions.py       # Custom exceptions
│   └── helpers.py
└── middleware/             # Middleware global
    └── error_handler.py

tests/                      # Tests
├── conftest.py             # Fixtures pytest
├── unit/                   # Unit tests
└── integration/            # Integration tests

migrations/                 # Alembic migrations
requirements.txt            # Dependencias
requirements-dev.txt        # Dev dependencies
.env.example                # Template de .env
Dockerfile
docker-compose.yml
pyproject.toml              # Config de herramientas (black, flake8, etc.)
```

## Instalación

```bash
# 1. Clonar repo
git clone https://github.com/mauc-agentic/block-by-block.git
cd block-by-block/backend

# 2. Crear venv
python -m venv venv
source venv/bin/activate  # macOS/Linux
# o: venv\Scripts\activate  # Windows

# 3. Instalar dependencias
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Para dev

# 4. Configurar .env
cp .env.example .env
# Editar .env con tus valores de Supabase, OpenRouter, blockchain, etc.

# 5. Crear BD
alembic upgrade head

# 6. Ejecutar
python -m app.main
# o: uvicorn app.main:app --reload
```

## Desarrollo

```bash
# Ejecutar con hot reload
uvicorn app.main:app --reload

# Tests
pytest
pytest --cov=app --cov-report=html  # Coverage

# Linting & formato
black app tests
flake8 app tests
mypy app

# Crear nueva migración
alembic revision --autogenerate -m "Descripción"
alembic upgrade head
```

## Docker

```bash
# Build
docker build -t block-by-block-backend .

# Run
docker run -p 8000:8000 --env-file .env block-by-block-backend

# Con docker-compose
docker-compose up -d
```

## API Documentation

- OpenAPI (Swagger): http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

### Auth (UC-001, UC-002, UC-003)
- `POST /api/v1/auth/signup` — Registrar cuenta
- `POST /api/v1/auth/login` — Iniciar sesión
- `POST /api/v1/auth/wallet/link` — Vincular wallet

### Causas (UC-004, UC-007, UC-008, UC-011)
- `POST /api/v1/causes` — Crear causa
- `GET /api/v1/causes` — Listar causas verificadas
- `GET /api/v1/causes/{id}` — Detalle de causa
- `GET /api/v1/users/{id}` — Perfil (dashboard)

### Donaciones (UC-005, UC-009)
- `POST /api/v1/causes/{id}/upload-image` — Subir evidencia
- `POST /api/v1/causes/{id}/donate` — Donar (instrucción de firma)

## Variables de entorno

Ver `.env.example` para referencia completa.

```
# Supabase
SUPABASE_DB_URL=postgresql://...

# Auth
SECRET_KEY=...
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=24

# Blockchain
HSK_RPC_URL=https://testnet.hsk.xyz
HSK_CHAIN_ID=133
CAUSE_VAULT_ADDRESS=0x...
AGENT_ADDRESS=0x...
AGENT_PRIVATE_KEY=0x...

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_URL=https://openrouter.ai/api/v1/messages
```

## Testing

```bash
# Todos los tests
pytest

# Unit tests solo
pytest tests/unit/

# Integration tests solo
pytest tests/integration/

# Con coverage
pytest --cov=app --cov-report=html
```

## Mapeo AIUP

Ver `../CLAUDE.md` para:
- Casos de uso (UC-001..011)
- Requerimientos (FR, NFR, C)
- Entidad model
- Traceability (UC → código)

## Contribuir

1. Crear rama desde `backend`
2. Implementar cambios
3. Agregar tests
4. Hacer PR con descripción de cambios

## Licencia

MIT

## Contacto

Miguel Uribe - migueluribe.ing@gmail.com
