# Implementation Status — Block by Block

**Auditado:** 2026-09-20 contra el código de `main` (backend, contrato, frontend) ejecutando `pytest --cov`, `forge test` y `forge coverage`.
**Stack:** Solidity ^0.8.24 + Foundry · FastAPI + Supabase (session pooler) · DeepSeek v4.1 Flash vía OpenRouter · Next.js 16 · HSK testnet (133).

> Este documento sustituye la versión anterior, que declaraba UC-011 implementado, 0 % de frontend y "bcrypt".
> Regla: un UC solo pasa a `Implemented` con código + prueba; `Tested` cuando cada A* y BR tiene prueba.

---

## 1. Estado general

| Componente            | Estado real                                                                                       |
|-----------------------|---------------------------------------------------------------------------------------------------|
| Documentación AIUP    | Vision, 22 FR, 15 NFR, 12 C, 14 UC, 4 TC, diagrama de casos de uso actualizado                   |
| Contrato `CauseVault` | Desplegado en HSK testnet. Foundry: **7/9 pruebas pasan, 2 fallan**. Cobertura de líneas 88.5 %   |
| Backend FastAPI       | 9 endpoints. `pytest`: **35 pasan, 3 skip**. Cobertura **66 %** (meta 85 %)                       |
| Agente IA (UC-006)    | Flujo IA + firma on-chain escrito; **no cierra el ciclo** (ver GAP-001..003)                      |
| Frontend Next.js      | Landing, FAQ y términos con datos de muestra; **sin llamadas al backend ni wallet**               |
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
| UC-001 | Implemented | `POST /api/v1/auth/signup`                                             | P: `test_signup_persists_to_supabase`                                                     | A1 (duplicados) y BR-002 sin prueba tras retirar SQLite; A3 (OAuth) no implementado    |
| UC-002 | Implemented | `POST /api/v1/auth/login`                                              | P: `test_login_queries_supabase`                                                          | A1 (credenciales inválidas) sin prueba                                                 |
| UC-003 | Implemented | `POST /api/v1/auth/wallet/link` + `verify_wallet_signature`            | A: 5 tests de firma (`test_helpers`, `test_wallet`); endpoint sin prueba                  | BR-003 (mensaje de un solo uso) **no aplicado**; A2 sin prueba                         |
| UC-004 | Approved    | `POST /api/v1/causes` (solo BD)                                        | P: `test_uc004_uc009_authenticated_flow`                                                                                       | Contrato `createCause` existe pero nada lo llama ni asigna `onchain_cause_id` (UC-013) |
| UC-005 | Approved    | `POST /api/v1/causes/{id}/upload-image`                                | —                                                                                         | Guarda solo un hash de 10 hex; la imagen no se almacena (FR-021)                       |
| UC-006 | Approved    | `services/agent.py`, `tasks.py`                                        | P: solo lectura de configuración/ABI HSK; lógica del agente 17 % de cobertura             | GAP-001..003                                                                           |
| UC-007 | Approved    | `GET /api/v1/causes` (filtra `Verified`)                               | P: `test_list_causes_from_supabase` (lista vacía)                                         | Nada marca `Verified`; no devuelve monto recaudado (BR-002)                            |
| UC-008 | Approved    | `GET /api/v1/causes/{id}`                                              | P: `test_uc004_uc009_authenticated_flow`                                                                                       | Devuelve causas no verificadas sin marcarlo; sin donaciones ni avance                  |
| UC-009 | Approved    | `POST /api/v1/causes/{id}/donate` (instrucción de firma) + `donate`    | Foundry: `test_TC001_HappyPath`, `test_UC009_DonateWithZeroAmount`                        | El backend no registra la donación (UC-014); sin prueba del endpoint                   |
| UC-010 | Implemented | `CauseVault.withdrawFunds` (sin endpoint, por diseño)                  | Foundry: `test_TC001_HappyPath`, `test_UC010_OnlyRecipientCanWithdraw`                    | `test_TC002_RejectedCauseBlocksFunds` falla (ver GAP-006)                              |
| UC-011 | Approved    | **No existe** `GET /users/{id}` (el router solo monta auth/causes/donations) | —                                                                                   | FR-012/013 abiertos; el documento previo lo marcaba implementado por error             |
| UC-012 | Implemented | `CauseVault.pause/unpause/setAgent`                                    | Foundry: `test_UC006_OnlyAgentCanVerify` (indirecto)                                      | Sin pruebas de pausa ni de rotación de agente                                          |
| UC-013 | Draft       | —                                                                      | —                                                                                         | Nuevo. Requiere revisión antes de implementar (regla 2)                                |
| UC-014 | Draft       | —                                                                      | —                                                                                         | Nuevo. Requiere revisión antes de implementar (regla 2)                                |

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
| GAP-001 | Crítica   | `verify_cause_task` guarda `Verification` pero **nunca actualiza `Cause.status`**: ninguna causa llega a `Verified`, el listado siempre queda vacío | FR-022      |
| GAP-002 | Crítica   | El agente evalúa una imagen **PNG de 1×1 píxel fija**; la foto del receptor no se guarda ni se lee                                                  | FR-021      |
| GAP-003 | Crítica   | `createCause` on-chain no se invoca; `onchain_cause_id` queda nulo, por lo que `verifyCause(cause_id)` usa el id de la BD, no el del contrato       | FR-019      |
| GAP-004 | Alta      | No hay endpoint de dashboard (`GET /users/{id}`)                                                                                                   | FR-012/013  |
| GAP-005 | Alta      | Ningún código escribe filas en `donations`                                                                                                         | FR-020      |
| GAP-006 | Alta      | Foundry: `test_TC002_RejectedCauseBlocksFunds` espera "no funds to withdraw" pero el contrato revierte con "cause not verified" (correcto según UC-010 A3); `test_GetRecipientCauses` falla por índice fuera de rango | NFR-001 |
| GAP-007 | Alta      | Cobertura backend 66 % (`agent.py` 17 %, `tasks.py` 48 %; `causes.py` y `donations.py` cubiertos solo parcialmente)                                                                         | NFR-001     |
| GAP-008 | Media     | Se eliminaron las pruebas de integración SQLite (duplicados, credenciales inválidas, link wallet) sin sustituirlas por equivalentes contra Supabase | UC-001..003 |
| GAP-009 | Media     | UC-003 BR-003 (mensaje de un solo uso) no se aplica: la misma firma puede reutilizarse                                                              | FR-003      |
| GAP-010 | Media     | Reintento A5 de UC-006 ("RPC de respaldo") no existe; solo un RPC configurado                                                                      | FR-007      |
| GAP-011 | Media     | `Verification.cause_id` es `unique`; el modelo lógico permite varias evaluaciones y UC-006 A2/A4 implican reintentos                                | FR-006      |
| GAP-012 | Media     | `verification_hash` simulado (`Qm`+sha256[:10]); no es un CID IPFS real                                                                             | UC-006 BR-004 |
| GAP-013 | Media     | `Base.metadata.create_all` al arrancar y `migrations/` vacío                                                                                        | NFR-013     |
| GAP-014 | Media     | Sin logging estructurado ni middleware global (`utils/logger.py`, `exceptions.py` a 0 % de cobertura)                                              | NFR-012     |
| GAP-015 | Resuelta  | `get_current_user` devolvía la función `get_db` en vez de una sesión: todo endpoint autenticado respondía 500 en `main`. Corregido con `_db_session` (import diferido) y cubierto por `test_uc004_uc009_authenticated_flow` | UC-004..009 |
| GAP-016 | Media     | Frontend sin integración: `lib/causes.ts` usa datos de muestra; sin wallet, sin rutas de UC-004..011                                              | C-006       |
| GAP-017 | Media     | `SECRET_KEY` real subido a `main` en el commit de configuración de Render (ya eliminado del árbol, sigue en el historial). Rotar.                   | NFR-008     |
| GAP-018 | Baja      | `venv/` había sido versionado por un `git add -A`; se retira del índice y se agrega a `.gitignore`                                                | C-008       |
| GAP-019 | Baja      | `on_event("shutdown")`, `from_orm` y `datetime.utcnow` están deprecados                                                                            | —           |

---

## 4. Métricas medidas

| Métrica                       | Medido 2026-09-20                  | Meta        |
|-------------------------------|-------------------------------------|-------------|
| `pytest`                      | 35 pasan, 3 skip, 0 fallan          | —           |
| Cobertura backend             | 66 % (551 líneas, 190 sin cubrir)   | ≥ 85 %      |
| `forge test`                  | 7 pasan, 2 fallan                   | 100 %       |
| Cobertura contrato (líneas)   | 88.52 % (54/61)                     | ≥ 85 %      |
| UC en `Implemented`           | 5 de 14 (UC-001,002,003,010,012)    | 14          |
| UC en `Approved`              | 7 (UC-004..009, UC-011)             | —           |
| UC en `Draft`                 | 2 (UC-013, UC-014)                  | —           |
| FR `Implemented`              | 5 de 22 (FR-001, 002, 003, 011, 018) | 17 (sin Deferred) |

---

## 5. Camino a MVP demostrable (orden sugerido)

1. **GAP-003 / UC-013**: revisar UC-013 y conectar `createCause` on-chain con `onchain_cause_id`.
2. **GAP-002 / FR-021**: guardar la imagen (Supabase Storage o disco del contenedor) y pasarla al agente.
3. **GAP-001 / FR-022**: al registrar el veredicto, actualizar `Cause.status` (Verified/Rejected).
4. **GAP-005 / UC-014** y **GAP-004 / UC-011**: registrar donaciones y exponer el dashboard.
5. **GAP-006**: corregir las dos pruebas de Foundry.
6. **GAP-007 / GAP-008**: pruebas contra Supabase para auth, causas, donación y agente (OpenRouter simulado) hasta 85 %.
7. **GAP-016**: conectar el frontend (lista de causas, detalle, wallet).
8. **GAP-017**: rotar `SECRET_KEY` y desplegar en Render.

## 6. Decisiones vigentes

- Red: HSK Chain testnet (133). Token: `MockUSDT` en testnet (C-012).
- BD: Supabase PostgreSQL por session pooler (C-010).
- Hash de contraseñas: argon2id (NFR-006).
- IA: `deepseek/deepseek-v4.1-flash` vía OpenRouter, umbral 0.80.
- Tareas de fondo: `ThreadPoolExecutor` (MVP); ruta de migración a Celery en `backend/TASKS.md`.
- Despliegue: Render con Docker (`render.yaml`).
