# Block by Block — Backend

API de la plataforma de donaciones peer-to-peer (donantes ↔ receptores verificados por IA, USDT on-chain en HSK testnet).
El backend **nunca custodia fondos ni firma transacciones de usuarios** (C-009): entrega instrucciones de firma y lee la
cadena para confirmar. Solo el agente verificador firma `verifyCause`.

Estado detallado, brechas y trazabilidad UC → código → pruebas: [`../docs/IMPLEMENTATION-STATUS.md`](../docs/IMPLEMENTATION-STATUS.md).

## Stack

- **Framework:** FastAPI + SQLAlchemy 2
- **BD:** Supabase PostgreSQL (session pooler)
- **Auth:** JWT (HS256, 24 h) + argon2id
- **IA:** OpenRouter, `deepseek/deepseek-v4.1-flash` (visión), endpoint `/chat/completions`
- **Blockchain:** web3.py 8 sobre HSK Chain testnet (chain id 133), contrato `CauseVault`

## Estructura

```
app/
├── main.py                   # App FastAPI (crea tablas al arrancar; ver NFR-013)
├── core/                     # config.py (.env), security.py (JWT, argon2), constants.py
├── api/v1/endpoints/
│   ├── auth.py               # UC-001, UC-002, UC-003
│   ├── causes.py             # UC-004, UC-005, UC-007, UC-008, UC-013
│   ├── donations.py          # UC-009, UC-014
│   └── users.py              # UC-011
├── db/models/base.py         # User, Cause, Donation, Verification, Evidence
├── schemas/common.py         # Modelos Pydantic
├── services/
│   ├── agent.py              # UC-006: IA → veredicto on-chain → estado de la causa
│   └── chain.py              # Lectura de la cadena (eventos de CauseVault, estado, token)
├── tasks.py                  # Cola de verificación (ThreadPoolExecutor; ruta a Celery en TASKS.md)
└── utils/helpers.py          # Firma de wallet, conversiones USDT
abi/CauseVault.json           # ABI del contrato
scripts/                      # Pruebas reales de punta a punta (gastan HSK testnet)
tests/{unit,integration}/     # Pruebas (integración contra Supabase real)
```

## Instalación y ejecución

```bash
cd backend
python3.12 -m venv ../venv && source ../venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env            # completar con tus valores
uvicorn app.main:app --reload   # http://localhost:8000/docs
```

Requisitos externos:
- **Supabase:** usar el *session pooler*. Si activaste *Network Restrictions*, agrega tu IP y las de Render
  (`74.220.48.0/24`, `74.220.56.0/24`); si no, la conexión falla con `address not in tenant allow_list`.
- **OpenRouter:** `OPENROUTER_URL=https://openrouter.ai/api/v1/chat/completions` (el endpoint `/messages` responde en formato
  Anthropic y rompe el parseo).
- **HSK:** wallet del agente con HSK de prueba (faucet: https://hskchain.net/faucet) y `CAUSE_VAULT_ADDRESS` desplegado.

## Endpoints (`/api/v1`)

| Método | Ruta | UC | Descripción |
|--------|------|----|-------------|
| GET | `/health` | — | Health check |
| POST | `/auth/signup`, `/auth/login` | UC-001, UC-002 | Registro e inicio de sesión |
| POST | `/auth/wallet/link` | UC-003 | Vincula wallet con firma de propiedad |
| POST | `/causes` | UC-004 | Crea causa (cualquier usuario con wallet vinculada) |
| POST | `/causes/{id}/publish` | UC-013 | Instrucción de firma de `createCause` |
| POST | `/causes/{id}/publish/confirm` | UC-013 | Enlaza el id on-chain leyendo `CauseCreated` |
| POST | `/causes/{id}/upload-image` | UC-005 | Guarda la evidencia; encola la verificación si ya está publicada |
| POST | `/causes/{id}/withdraw` | UC-010 | Instrucción de firma de `withdrawFunds` (solo el titular; 400 si no hay fondos) |
| POST | `/causes/{id}/verify` | UC-006 | El titular reintenta la verificación de una causa Pending (202; 409 si ya hay una en curso) |
| GET | `/causes/{id}/evidence` | FR-021 | Imagen de la causa (oculta mientras está Pending) |
| GET | `/causes` | UC-007 | Causas Verified con monto recaudado |
| GET | `/causes/{id}` | UC-008 | Detalle, avance y donaciones |
| POST | `/causes/{id}/donate` | UC-009 | Instrucciones `approve` + `donate` (el donante firma) |
| POST | `/causes/{id}/donations/confirm` | UC-014 | Registra la donación leyendo `DonationReceived` |
| GET | `/users/me/dashboard` | UC-011 | Dashboard del usuario autenticado: sus causas (con saldo retirable) y sus donaciones |

`withdrawFunds` (UC-010) es solo on-chain: el receptor firma directo en el contrato.

### Flujo completo

```
signup → wallet/link → POST /causes → publish (firma createCause) → publish/confirm
      → upload-image → [agente: IA + verifyCause on-chain → causa Verified/Rejected]
      → GET /causes → donate (firma approve + donate) → donations/confirm → GET /users/me/dashboard
      → withdrawFunds (on-chain)
```

Si el RPC de HSK aún no ve la transacción, `publish/confirm` y `donations/confirm` responden 400 *not confirmed*:
el cliente debe reintentar unos segundos después (los nodos del RPC se desfasan).

## Pruebas

```bash
pytest tests/ -v --cov=app --cov-report=term-missing   # ~5 min, usa Supabase real
pytest tests/unit -q                                   # sin red, ~1 s

# Pruebas reales de punta a punta (Supabase + HSK testnet + OpenRouter); limpian la BD al terminar
python -m scripts.e2e_verification   # publicar → IA → veredicto on-chain (Rejected y Verified)
python -m scripts.e2e_donation       # donar (approve+donate), registrar, dashboards, retirar

# Ensayar una foto real contra la IA antes de la demostración (no toca BD ni cadena; cuesta centavos)
python -m scripts.try_ai_verdict foto.jpg --description "Descripción exacta de la causa" --runs 3

# Donar a una causa Verified con la wallet local (solo demostración en testnet, mientras la UI no tenga la pantalla de donar);
# imprime el fragmento para registrar la donación con la sesión del usuario en la consola del navegador
python -m scripts.donate --cause 352 --amount 10 [--dry-run]

# Faucet de pruebas: envía MockUSDT (y HSK) desde la wallet del agente; solo testnet, con topes (1000 USDT / 0.05 HSK)
python -m scripts.fund_wallet --user carlos --usdt 100 [--hsk 0.01] [--dry-run]
python -m scripts.fund_wallet 0xDirección --usdt 50
```

Las pruebas de integración crean usuarios `e2e_*` en Supabase y los eliminan. Ver `../TESTING_STATUS.md`.

## Despliegue

Render (Python 3.12.4, ver `../render.yaml` y `../DEPLOYMENT.md`). Start command:
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Secretos solo por variables de entorno, nunca en el repositorio.

## Metodología

El proyecto sigue AIUP: ver [`../CLAUDE.md`](../CLAUDE.md) (mapa UC → código, reglas) y `../docs/` (visión, requisitos,
modelo de entidades, casos de uso, casos de prueba). Cada UC y BR debe tener al menos una prueba (convención
`test_ucNNN_brNNN_*`).
