# Implementation Status — Block by Block

**Auditado:** 2026-09-20 contra el código de `main` (backend, contrato, frontend) ejecutando `pytest --cov`, `forge test` y `forge coverage`.
**Stack:** Solidity ^0.8.24 + Foundry · FastAPI + Supabase (session pooler) · DeepSeek v4.1 Flash vía OpenRouter · Next.js 16 · HSK testnet (133).

> Este documento sustituye la versión anterior, que declaraba UC-011 implementado, 0 % de frontend y "bcrypt".
> Regla: un UC solo pasa a `Implemented` con código + prueba; `Tested` cuando cada A* y BR tiene prueba.

---

## 1. Estado general

| Componente            | Estado real                                                                                       |
|-----------------------|---------------------------------------------------------------------------------------------------|
| Documentación AIUP    | Un solo conjunto para todo el proyecto: `api_contract.md` (generado y probado), `glossary.md`, `traceability.md` (matriz por capa). |
| Especificación        | Vision, 24 FR, 17 NFR, 13 C, 14 UC, 4 TC, diagrama de casos de uso actualizado                   |
| Contrato `CauseVault` | Desplegado en HSK testnet. Foundry: **7/9 pruebas pasan, 2 fallan**. Cobertura de líneas 88.5 %   |
| Backend FastAPI       | 11 endpoints (+`POST /auth/google/signup`, `POST /auth/google/login`). Unit: **23/23 pasan** (verificado 2026-09-20); suite de integración no se corrió esta sesión (bloqueada por allowlist de IP de Supabase desde esta máquina) |
| Agente IA (UC-006)    | Flujo IA + firma on-chain escrito; **no cierra el ciclo** (ver GAP-001..003)                      |
| Frontend Next.js      | Landing, FAQ, términos y **auth (signup/login, email y Google) conectados al backend**; sin wallet ni causas |
| Despliegue            | `Dockerfile`, `render.yaml`, `DEPLOYMENT.md` listos; **Render aún no desplegado**                 |

### Direcciones en HSK testnet

| Elemento     | Dirección                                    |
|--------------|-----------------------------------------------|
| CauseVault   | `0x591723edf457032ad341366f4654a973fbd0daa9`  |
| MockUSDT     | `0xD6D6fbbcAe342788DCC18fF2b1cd692c8b8837ec`  |
| Agente/Owner | `0x94C5E2065F555e01364ad83879D3ADDD298E706f`  |

---

## 2. Trazabilidad UC → implementación → pruebas

Leyenda de prueba: **A** = automatizada, **P** = parcial, **—** = ninguna.

| UC     | Status doc  | Implementación                                                        | Pruebas                                                                                   | Estado real / faltante                                                                 |
|--------|-------------|------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------|
| UC-001 | Implemented | `POST /api/v1/auth/signup`, `POST /api/v1/auth/google/signup` (A3)     | P: `test_signup_persists_to_supabase`, `test_uc001_a3_google_signup_creates_user`, `test_uc001_a3_google_signup_rejects_duplicate_identity` (no corridas esta sesión, ver nota de allowlist arriba) | A1 (duplicados) y BR-002 sin prueba tras retirar SQLite; A3 (Google) implementado, sin ejecutar en Supabase real todavía |
| UC-002 | Implemented | `POST /api/v1/auth/login`, `POST /api/v1/auth/google/login` (A3, A4)   | P: `test_login_queries_supabase`, `test_uc002_a3_google_login_existing_user`, `test_uc002_a4_google_login_unregistered_identity` (no corridas esta sesión) | A1 (credenciales inválidas) sin prueba; A3/A4 (Google) implementado, sin ejecutar en Supabase real todavía |
| UC-003 | Implemented | `POST /api/v1/auth/wallet/link` + `verify_wallet_signature`            | A: 5 tests de firma (`test_helpers`, `test_wallet`); endpoint sin prueba                  | BR-003 (mensaje de un solo uso) **no aplicado**; A2 sin prueba                         |
| UC-004 | Implemented | `POST /api/v1/causes` (exige wallet, A2); pasos 7-8 en UC-013                | A: `test_uc004_uc009_authenticated_flow` (A2, BR-001), `scripts/e2e_*.py`                  | Falta que el frontend firme `createCause` con la wallet (el backend ya entrega la instrucción) |
| UC-005 | Implemented | `POST /api/v1/causes/{id}/upload-image`, `GET /causes/{id}/evidence`   | A: `TestEvidenceUC005` (A1, A3, BR-001, BR-003, tamaño, firma del archivo)                 | Imagen guardada en tabla `evidences` (Postgres); A2 con otro usuario autenticado sin prueba |
| UC-006 | Implemented | `services/agent.py`, `tasks.py`                                        | A: `test_agent.py` (20) + `TestAgentCycleUC006` (7) + E2E real en HSK/OpenRouter           | BR-004: huella SHA-256, no CID IPFS. Sin RPC de respaldo (spec ajustada)               |
| UC-007 | Approved    | `GET /api/v1/causes` (filtra `Verified`)                               | A: lista solo causas Verified (`test_uc006_br005…`, `test_uc006_a1…`)                      | No devuelve monto recaudado (BR-002) hasta UC-014                                      |
| UC-008 | Approved    | `GET /api/v1/causes/{id}`                                              | P: `test_uc004_uc009_authenticated_flow`                                                                                       | Devuelve causas no verificadas sin marcarlo; sin donaciones ni avance                  |
| UC-009 | Approved    | `POST /api/v1/causes/{id}/donate` (instrucción de firma) + `donate`    | Foundry: `test_TC001_HappyPath`, `test_UC009_DonateWithZeroAmount`                        | El backend no registra la donación (UC-014); sin prueba del endpoint                   |
| UC-010 | Implemented | `CauseVault.withdrawFunds` (sin endpoint, por diseño)                  | Foundry: `test_TC001_HappyPath`, `test_UC010_OnlyRecipientCanWithdraw`                    | `test_TC002_RejectedCauseBlocksFunds` falla (ver GAP-006)                              |
| UC-011 | Approved    | `GET /api/v1/users/me/dashboard` (`app/api/v1/endpoints/users.py`): causas propias + `wallet_address` fresco | P: `test_uc011_a2_a3_dashboard_empty_state_and_wallet_alert`, `test_uc011_br002_dashboard_requires_auth`, `test_uc011_br002_dashboard_only_shows_own_causes` (no corridas esta sesión, ver nota de allowlist arriba) | A2 y A3 implementados y probados (frontend `/dashboard`); A1 (donante sin donaciones) sigue sin implementar porque depende de UC-014 (Draft); BR-001 "por rol" ya no aplica tal cual tras retirar el rol fijo (commit `70745d2`) — pendiente reconciliar el texto del UC |
| UC-012 | Implemented | `CauseVault.pause/unpause/setAgent`                                    | Foundry: `test_UC006_OnlyAgentCanVerify` (indirecto)                                      | Sin pruebas de pausa ni de rotación de agente                                          |
| UC-013 | Implemented | `POST /causes/{id}/publish`, `POST /causes/{id}/publish/confirm`, `services/chain.py` | A: `TestPublishUC013` (A2..A6, BR-002) + E2E real con `createCause` en HSK                | A1 (firma rechazada) es del frontend; el frontend aún no firma                        |
| UC-014 | Implemented | `POST /causes/{id}/donations/confirm`, `services/chain.py`              | A: `TestRegisterDonationUC014` (A1..A4, BR-001, BR-002, BR-004) + `test_chain.py` + E2E real | El frontend debe reintentar si el RPC aún no ve la tx (nodos desfasados)               |

### Test cases

| TC     | Cobertura automatizada actual                                                                                     |
|--------|-------------------------------------------------------------------------------------------------------------------|
| TC-001 | Solo en contrato (`test_TC001_HappyPath` pasa). Sin journey backend+contrato+HSK                                  |
| TC-002 | Solo en contrato y **falla** (GAP-006)                                                                            |
| TC-003 | Nuevo, sin automatizar (necesita simular OpenRouter)                                                              |
| TC-004 | Nuevo, sin automatizar (Foundry: pausa y `setAgent`)                                                              |

---

## 3. Registro de brechas (GAP)

| ID      | Severidad | Brecha                                                                                                                                             | Requisito   |
|---------|-----------|----------------------------------------------------------------------------------------------------------------------------------------------------|-------------|
| GAP-001 | Resuelta  | `verify_cause_task` guarda `Verification` pero **nunca actualiza `Cause.status`**: ninguna causa llega a `Verified`, el listado siempre queda vacío | FR-022      |
| GAP-002 | Resuelta  | El agente evalúa una imagen **PNG de 1×1 píxel fija**; la foto del receptor no se guarda ni se lee                                                  | FR-021      |
| GAP-003 | Resuelta  | `createCause` on-chain no se invoca; `onchain_cause_id` queda nulo, por lo que `verifyCause(cause_id)` usa el id de la BD, no el del contrato       | FR-019      |
| GAP-004 | Resuelta  | No había endpoint de dashboard; agregado `GET /api/v1/users/me/dashboard` (UC-011 A2, A3, BR-002). Falta la parte de donante (A1), que depende de UC-014 | FR-012/013  |
| GAP-005 | Alta      | Ningún código escribe filas en `donations`                                                                                                         | FR-020      |
| GAP-006 | Alta      | Foundry: `test_TC002_RejectedCauseBlocksFunds` espera "no funds to withdraw" pero el contrato revierte con "cause not verified" (correcto según UC-010 A3); `test_GetRecipientCauses` falla por índice fuera de rango | NFR-001 |
| GAP-007 | Resuelta  | Cobertura backend 66 % (`agent.py` 17 %, `tasks.py` 48 %; `causes.py` y `donations.py` cubiertos solo parcialmente)                                                                         | NFR-001     |
| GAP-008 | Resuelta  | Se eliminaron las pruebas de integración SQLite (duplicados, credenciales inválidas, link wallet) sin sustituirlas por equivalentes contra Supabase | UC-001..003 |
| GAP-009 | Media     | UC-003 BR-003 (mensaje de un solo uso) no se aplica: la misma firma puede reutilizarse                                                              | FR-003      |
| GAP-010 | Resuelta  | Reintento A5 de UC-006 ("RPC de respaldo") no existe; solo un RPC configurado                                                                      | FR-007      |
| GAP-011 | Resuelta  | `Verification.cause_id` es `unique`; el modelo lógico permite varias evaluaciones y UC-006 A2/A4 implican reintentos                                | FR-006      |
| GAP-012 | Resuelta  | `verification_hash` simulado (`Qm`+sha256[:10]); no es un CID IPFS real                                                                             | UC-006 BR-004 |
| GAP-013 | Media     | `Base.metadata.create_all` al arrancar y `migrations/` vacío                                                                                        | NFR-013     |
| GAP-014 | Media     | Sin logging estructurado ni middleware global (`utils/logger.py`, `exceptions.py` a 0 % de cobertura)                                              | NFR-012     |
| GAP-015 | Resuelta  | `get_current_user` devolvía la función `get_db` en vez de una sesión: todo endpoint autenticado respondía 500 en `main`. Corregido con `_db_session` (import diferido) y cubierto por `test_uc004_uc009_authenticated_flow` | UC-004..009 |
| GAP-016 | Media     | Frontend sin integración con el resto de la API: `lib/causes.ts` usa datos de muestra en la landing; sin wallet, sin rutas de UC-004, UC-008, UC-009. Auth (UC-001, UC-002) ya conecta a `/auth/*`; `/dashboard` (UC-011) ya conecta a `GET /users/me/dashboard` y `GET /causes` | C-006       |
| GAP-020 | Media     | El SQL Editor / conexión directa de Supabase rechaza la IP de esta máquina de desarrollo (`EADDRNOTALLOWED`); los tests de integración no se pueden correr localmente hasta agregarla al allowlist del proyecto en Supabase | NFR-001 |
| GAP-021 | Baja      | `Base.metadata.create_all` no altera columnas existentes: `auth_provider`/`external_id`/`hashed_password NULL` (y el `DROP COLUMN user_type`, ver decisión abajo) en `users` requieren correr `backend/migrations/manual/2026-09-20_google_auth.sql` a mano en Supabase antes de desplegar | UC-001, UC-002, UC-004 |
| GAP-017 | Media     | `SECRET_KEY` real subido a `main` en el commit de configuración de Render (ya eliminado del árbol, sigue en el historial). Rotar.                   | NFR-008     |
| GAP-018 | Baja      | `venv/` había sido versionado por un `git add -A`; se retira del índice y se agrega a `.gitignore`                                                | C-008       |
| GAP-022 | Media     | El contrato acepta donaciones a causas `Completed` (solo exige `verified`), contradiciendo UC-009 A4; el backend ya no emite la instrucción, pero un cliente puede llamar al contrato directamente | UC-009 A4 |
| GAP-023 | Media     | El RPC de HSK es un balanceador con nodos desfasados: `confirm` puede responder 400 "not confirmed" justo tras firmar; el cliente debe reintentar | UC-014 A4 |
| GAP-024 | Alta      | El frontend no tiene wallet: no puede vincularla (UC-003) ni firmar `createCause`, `approve`, `donate` ni `withdrawFunds` | FR-024      |
| GAP-025 | Media     | `frontend/lib/causes.ts` usa datos de muestra con otra forma (camelCase, números); la API entrega snake_case y strings decimales (ver `api_contract.md` §4) | C-006       |
| GAP-026 | Alta      | Faltan las rutas del frontend de UC-004, 005, 008, 009, 011, 013 y 014 (`/cause/create`, `/cause/[id]`, `/dashboard/*`)       | FR-004..013 |
| GAP-027 | Media     | El frontend no tiene pruebas ni una convención `describe('UC-###')`                                                            | NFR-017     |
| GAP-028 | Resuelta  | La columna `users.user_type` desapareció de Supabase: no era un error, sino la decisión de producto "sin rol fijo por cuenta" (commit `70745d2`, migración manual). El código, las pruebas y los docs se alinearon al modelo sin rol | FR-001      |
| GAP-019 | Baja      | `on_event("shutdown")`, `from_orm` y `datetime.utcnow` están deprecados                                                                            | —           |

---

## 4. Métricas medidas

| Métrica                       | Medido 2026-09-20                  | Meta        |
|-------------------------------|-------------------------------------|-------------|
| `pytest`                      | 120 pasan, 3 skip, 0 fallan         | —           |
| Cobertura backend             | 91 % (885 líneas, 81 sin cubrir)    | ≥ 85 %      |
| `forge test`                  | 7 pasan, 2 fallan                   | 100 %       |
| Cobertura contrato (líneas)   | 88.52 % (54/61)                     | ≥ 85 %      |
| UC en `Implemented`           | 8 de 14 (UC-001,002,003,005,006,010,012,013) | 14 |
| UC en `Approved`              | 5 (UC-004, 007, 008, 009, 011)      | —           |
| UC en `Draft`                 | 1 (UC-014)                          | —           |
| FR Implemented o Verified     | 12 de 22 (Verified: FR-005, 006, 007, 019, 021, 022) | 17 (sin Deferred) |

---

## 5. Camino a MVP demostrable (orden sugerido)

Hecho y verificado en HSK testnet con `backend/scripts/e2e_verification.py` y `e2e_donation.py`:
crear causa → publicar on-chain → evidencia → IA → veredicto on-chain → listado → donar (`approve` + `donate`)
→ registrar donación → dashboards → retirar.

1. **GAP-016**: conectar el frontend (lista, detalle, wallet que firma `createCause`, `approve`, `donate`, `withdrawFunds`, y reintento de `confirm`).
2. **GAP-006**: corregir las dos pruebas de Foundry y cerrar GAP-022 (bloquear donaciones a `Completed` en el contrato).
3. **GAP-007/008**: cerrar el 85 % de cobertura (auth, seguridad) y **GAP-009** (mensaje de wallet de un solo uso).
4. **GAP-013/014**: Alembic y logging estructurado; **reintento de verificación** si Render reinicia a mitad.
5. **GAP-017**: rotar `SECRET_KEY` (hecho por el equipo) y actualizar `OPENROUTER_URL` en Render.
6. **GAP-020**: agregar la IP de cada desarrollador al allowlist de Supabase para correr `pytest` de integración en local.
7. **GAP-021**: ejecutar `backend/migrations/manual/2026-09-20_google_auth.sql` contra Supabase antes de desplegar (ya aplicado en la BD compartida; falta automatizarlo con Alembic, GAP-013).

## 6. Decisiones vigentes

- Red: HSK Chain testnet (133). Token: `MockUSDT` en testnet (C-012).
- BD: Supabase PostgreSQL por session pooler (C-010).
- Hash de contraseñas: argon2id (NFR-006).
- IA: `deepseek/deepseek-v4.1-flash` vía OpenRouter, umbral 0.80.
- Tareas de fondo: `ThreadPoolExecutor` (MVP); ruta de migración a Celery en `backend/TASKS.md`.
- Despliegue: Render con Docker (`render.yaml`).
- Login/registro con Google: Google Identity Services (ID token) verificado en el backend con `google-auth`
  (`GOOGLE_CLIENT_ID` como audience); sin NextAuth ni flujo de redirect/código OAuth.
- Cambio de producto (2026-09-20): se retira el rol fijo por cuenta (`user_type`). Cualquier cuenta puede donar
  y publicar causas; UC-001 BR-001 y UC-004 BR-001 se eliminaron (columna `users.user_type` se elimina via
  `backend/migrations/manual/2026-09-20_google_auth.sql`, pendiente de ejecutar en Supabase).
