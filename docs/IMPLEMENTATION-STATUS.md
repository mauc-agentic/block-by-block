# Implementation Status — Block by Block

**Auditado:** 2026-09-20 contra `main` (contrato, backend, frontend, despliegue) ejecutando `pytest --cov`, `forge test`/`forge coverage` y las pruebas reales de punta a punta.
**Stack:** Solidity ^0.8.24 + Foundry · FastAPI + Supabase (session pooler) · DeepSeek v4.1 Flash vía OpenRouter · Next.js 16 · HSK testnet (133).
**Cómo leer este documento:** frontend, backend y contrato son **una sola pieza** (ver [vision.md](vision.md)). El estado por capa de cada UC está en
[traceability.md](traceability.md), el vocabulario en [glossary.md](glossary.md) y el contrato de API en [api_contract.md](api_contract.md).
La sección 2 se **genera** de los propios documentos (`cd backend && python -m scripts.aiup_summary`); una prueba falla si se desactualiza.

---

## 1. Resumen ejecutivo

- **Backend y contrato están completos para el flujo principal** y verificados de punta a punta en HSK testnet con dinero de prueba real:
  crear causa → publicar on-chain → evidencia → IA → veredicto on-chain → listado → donar → registrar → dashboard → retirar.
- **El frontend tiene** landing, autenticación (correo y Google), vinculación de wallet con Rabby (verificada en vivo) y dashboard. **Le faltan** las pantallas de
  crear causa, publicar, detalle, donar y retirar, y la firma de transacciones con la wallet. Es lo que hoy impide correr el flujo completo desde la interfaz (TC-005).
- **Calidad:** 177 pruebas automatizadas de backend (3 omitidas a propósito), cobertura de líneas **92 %** (meta 85 %); contrato **88.5 %** con 2 pruebas Foundry fallando.
- **Riesgos abiertos principales:** firmar transacciones en el frontend (GAP-024/026), pruebas Foundry (GAP-006), wallet del agente = wallet personal (GAP-032),
  donaciones sin reconciliar si el cliente no confirma (GAP-034) y secreto rotado que sigue en el historial de `main` (GAP-017).

---

## 2. Resumen generado desde los documentos AIUP

<!-- BEGIN SUMMARY -->
### Casos de uso

| UC | Caso de uso | Estado |
|----|-------------|--------|
| UC-001 | Register Account | Implemented |
| UC-002 | Log In | Implemented |
| UC-003 | Link Wallet | Implemented |
| UC-004 | Create Cause | Approved |
| UC-005 | Upload Cause Evidence | Approved |
| UC-006 | Verify Cause With AI | Implemented |
| UC-007 | Browse Verified Causes | Approved |
| UC-008 | View Cause Detail | Approved |
| UC-009 | Donate To Cause | Approved |
| UC-010 | Withdraw Funds | Approved |
| UC-011 | View Dashboard | Approved |
| UC-012 | Administer Contract | Approved |
| UC-013 | Publish Cause On-Chain | Approved |
| UC-014 | Register Donation | Approved |

### Casos de prueba (journeys)

| TC | Journey | Estado |
|----|---------|--------|
| TC-001 | Recipient To Donor Happy Path | Implemented |
| TC-002 | Rejected Cause Blocks Funds | Implemented |
| TC-003 | AI Provider Failure Keeps Cause Pending | Implemented |
| TC-004 | Contract Pause And Agent Rotation | Draft |
| TC-005 | Live End-to-End With Real Users | Draft |

### Requisitos por estado

| Tipo | Verified | Implemented | In Progress | Open | Deferred | Total |
|------|----------|-------------|-------------|------|----------|-------|
| Funcionales (FR) | 6 | 2 | 12 | 0 | 4 | 24 |
| No funcionales (NFR) | 0 | 8 | 4 | 3 | 2 | 17 |
| Restricciones (C) | 0 | 10 | 2 | 0 | 1 | 13 |

Requisitos aún no terminados:

- **FR-004** Crear causa — In Progress
- **FR-005** Subir evidencia — In Progress
- **FR-008** Explorar causas — In Progress
- **FR-009** Detalle de causa — In Progress
- **FR-010** Donar — In Progress
- **FR-011** Retirar fondos — In Progress
- **FR-012** Dashboard de donante — In Progress
- **FR-013** Dashboard de receptor — In Progress
- **FR-018** Administración del contrato — In Progress
- **FR-019** Publicar causa on-chain — In Progress
- **FR-020** Registrar donación — In Progress
- **FR-024** Wallet en el navegador — In Progress
- **NFR-002** Latencia de listado — In Progress
- **NFR-003** Tiempo de verificación — In Progress
- **NFR-008** Secretos fuera del repo — In Progress
- **NFR-012** Observabilidad — Open
- **NFR-013** Migraciones versionadas — Open
- **NFR-015** Disponibilidad del servicio — In Progress
- **NFR-017** Pruebas de frontend — Open
- **C-007** Plazo — In Progress
- **C-011** Despliegue backend — In Progress

### Brechas

| Crítica | Alta | Media | Baja | Abiertas | Resueltas | Total |
|---------|------|-------|------|----------|-----------|-------|
| 0 | 3 | 13 | 3 | 19 | 17 | 36 |
<!-- END SUMMARY -->

---

## 3. Estado por componente

| Componente            | Estado real                                                                                       |
|-----------------------|---------------------------------------------------------------------------------------------------|
| Documentación AIUP    | Un solo conjunto para todo el proyecto: `api_contract.md` (generado y probado), `glossary.md`, `traceability.md` (matriz por capa). |
| Especificación        | Vision, 24 FR, 17 NFR, 13 C, 14 UC, 4 TC, diagrama de casos de uso actualizado                   |
| Contrato `CauseVault` | Desplegado en HSK testnet. Foundry: **7/9 pruebas pasan, 2 fallan**. Cobertura de líneas 88.5 %   |
| Backend FastAPI       | 11 endpoints (+`POST /auth/google/signup`, `POST /auth/google/login`). Unit: **23/23 pasan** (verificado 2026-09-20); suite de integración no se corrió esta sesión (bloqueada por allowlist de IP de Supabase desde esta máquina) |
| Agente IA (UC-006)    | Flujo IA + firma on-chain escrito; **no cierra el ciclo** (ver GAP-001..003)                      |
| Frontend Next.js      | Landing (causas verificadas reales vía `GET /causes`, con `featuredCauses` de muestra solo si aún no hay ninguna), FAQ, términos, **auth (signup/login, email y Google)**, **dashboard (`/dashboard`, causas propias + verificadas)**, **vinculación de wallet (`/wallet`, Rabby/EIP-1193)** y **crear causa (`/cause/create`: UC-004 + UC-013 firmando `createCause` con la wallet + UC-005 subiendo la evidencia)** conectados al backend; sin verificar manualmente en HSK testnet todavía. Faltan detalle de causa y donar/retirar — GAP-026 |
| Despliegue            | `Dockerfile`, `render.yaml`, `DEPLOYMENT.md` listos; **desplegado**: backend en Render, frontend en Vercel |
| Componente | Estado real |
|------------|-------------|
| **Contrato `CauseVault`** | Desplegado en HSK testnet. Foundry: **7 de 9 pruebas pasan, 2 fallan** (GAP-006); cobertura de líneas 88.5 %, ramas 69.7 %. Sin pruebas de pausa ni de rotación de agente (GAP-030). |
| **Backend FastAPI** | 17 endpoints: auth (correo y Google), wallet, causas, publicar y confirmar, evidencia, reintento de verificación, donar y confirmar, dashboard. **Desplegado en Render**; la última versión con `POST /causes/{id}/verify` está en `main` y pendiente de redespliegue. |
| **Agente IA (UC-006)** | Ciclo cerrado y verificado en real: IA → veredicto on-chain → estado de la causa. Reintento manual, barrido al arrancar y una verificación a la vez por causa. Ensayo previo de una foto con `try_ai_verdict`. |
| **Frontend Next.js** | Rutas: `/`, `/faq`, `/terms`, `/auth/login`, `/auth/signup`, `/wallet`, `/dashboard`. Sin `/cause/create` ni `/cause/[id]`, sin firma de transacciones y **sin pruebas**. Desplegado en Vercel. |
| **Base de datos** | Supabase por session pooler. El esquema lo cambian scripts manuales en `backend/migrations/manual/` (Alembic pendiente, GAP-013). Se retiró `users.user_type` por decisión de producto. |
| **Despliegue** | Backend en Render (Python 3.12.4, `render.yaml`), frontend en Vercel, `DEPLOYMENT.md` con notas operativas. Render gratuito duerme (~50 s de arranque en frío, GAP-035). |
| **Documentación AIUP** | Conjunto único: visión, glosario, contrato de API generado y probado, trazabilidad por capa, 14 UC, 5 TC, requisitos y este estado. Regla "una sola pieza": un UC/FR es `Implemented` solo con todas sus capas. **Pruebas de integridad** (`test_aiup_integrity.py`) validan IDs, estados y enlaces entre archivos. |

### Direcciones en HSK testnet

| Elemento | Dirección |
|----------|-----------|
| CauseVault | `0x591723edf457032ad341366f4654a973fbd0daa9` |
| MockUSDT | `0xD6D6fbbcAe342788DCC18fF2b1cd692c8b8837ec` |
| Agente / dueño / wallet de Miguel | `0x94C5E2065F555e01364ad83879D3ADDD298E706f` |

---

## 4. Lo que se completó

**Especificación y proceso**
- Conjunto AIUP unificado para frontend y backend: `glossary.md`, `api_contract.md` (tablas generadas del código), `traceability.md`, este estado generado y 5 TC (TC-001..003 automatizados).
- 14 UC especificados y validados con el validador AIUP; **4 en `Implemented`** (UC-001, 002, 003, 006: todas sus capas existen) y 10 en `Approved` con backend y contrato listos y la pantalla pendiente. Pruebas de integridad de la documentación.

**Contrato y backend**
- Registro e inicio de sesión (correo y Google), vinculación de wallet por firma, crear causa, **publicar on-chain**, subir evidencia, verificación con IA con veredicto on-chain,
  listado con monto recaudado, detalle con donaciones, donar (`approve` + `donate`), registrar donaciones leyendo la cadena, dashboard, reintento de verificación.
- Argon2id, JWT 24 h, nonce seguro del agente, eventos filtrados por la dirección del contrato, evidencia guardada con SHA-256.
- Herramientas: `e2e_verification`, `e2e_donation`, `try_ai_verdict`, `fund_wallet`, `generate_api_contract`, `aiup_summary`.

**Frontend**
- Landing, FAQ, términos, autenticación (correo y Google), vinculación de wallet con Rabby verificada en vivo, dashboard protegido con alerta de wallet.

**Verificado en real (HSK testnet)**
- Causa rechazada por la IA real (motivo coherente) y verificada con veredicto simulado; donación de 3 USDT con `approve` + `donate` desde una wallet distinta, registro,
  dashboards y retiro del receptor (+3.0 USDT). Carlos ya tiene 100 MockUSDT para la prueba con usuarios reales.

---

## 5. Pendiente (backlog priorizado)

### P0 — Para correr TC-005 (flujo real Miguel → Carlos)

| # | Tarea | Responsable | Brecha |
|---|-------|-------------|--------|
| 1 | Pantalla **crear causa** con subida de foto | Frontend | GAP-026 |
| 2 | **Publicar** en el contrato: firmar `createCause` con Rabby, cambiar a la red 133 y confirmar con reintentos | Frontend | GAP-024 |
| 3 | Pantalla de **detalle** con estado (esperar el veredicto), barra de avance y donaciones, y botón "Reintentar verificación" | Frontend | GAP-026 |
| 4 | **Donar**: `approve` + `donate` con Rabby, `confirm` con reintentos y hash guardado en `localStorage` | Frontend | GAP-024, GAP-023 |
| 5 | **Retirar** (`withdrawFunds(onchain_cause_id)`) y añadir MockUSDT a Rabby (`wallet_watchAsset`) | Frontend | GAP-024 |
| 6 | **Ensayar la foto real** con `try_ai_verdict` (3 de 3 aprobadas) | Miguel | GAP-033 |
| 7 | **Redesplegar Render** con el último `main` y comprobar `/verify`, `OPENROUTER_URL`, `ALLOWED_ORIGINS`; despertar el servicio antes de la demo | Miguel / Andres | GAP-035 |
| 8 | **Ejecutar TC-005 en vivo** y guardar la evidencia (hashes y capturas) | Todos | — |

### P1 — Antes de dar el MVP por cerrado

| # | Tarea | Responsable | Brecha |
|---|-------|-------------|--------|
| 9 | Corregir las 2 pruebas Foundry y agregar las de pausa y rotación de agente | Contrato | GAP-006, GAP-030 |
| 10 | Bloquear donaciones a causas `Completed` en el contrato | Contrato | GAP-022 |
| 11 | Reconciliar donaciones on-chain que el cliente no confirmó (tarea que lea eventos `DonationReceived`) | Backend | GAP-034 |
| 12 | Separar la wallet del agente de la personal y de la dueña del contrato | Miguel | GAP-032 |
| 13 | Mensaje de un solo uso para vincular wallet (UC-003 BR-003) | Backend | GAP-009 |
| 14 | Decidir si se reescribe otra vez el historial de `main` (secreto rotado reintroducido por un merge) | Equipo | GAP-017 |

### P2 — Endurecimiento

Alembic (GAP-013), logging estructurado y middleware de errores (GAP-014), pruebas de frontend (GAP-027), adaptar `lib/causes.ts` al contrato (GAP-025),
medir NFR-002 y NFR-003 (GAP-031), deprecaciones (GAP-019), límite de tasa (NFR-014, diferido), revisión humana de rechazos (FR-014, diferido; GAP-033).

---

## 2. Trazabilidad UC → implementación → pruebas

Leyenda de prueba: **A** = automatizada, **P** = parcial, **—** = ninguna.

| UC     | Status doc  | Implementación                                                        | Pruebas                                                                                   | Estado real / faltante                                                                 |
|--------|-------------|------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------|
| UC-001 | Implemented | `POST /api/v1/auth/signup`, `POST /api/v1/auth/google/signup` (A3)     | P: `test_signup_persists_to_supabase`, `test_uc001_a3_google_signup_creates_user`, `test_uc001_a3_google_signup_rejects_duplicate_identity` (no corridas esta sesión, ver nota de allowlist arriba) | A1 (duplicados) y BR-002 sin prueba tras retirar SQLite; A3 (Google) implementado, sin ejecutar en Supabase real todavía |
| UC-002 | Implemented | `POST /api/v1/auth/login`, `POST /api/v1/auth/google/login` (A3, A4)   | P: `test_login_queries_supabase`, `test_uc002_a3_google_login_existing_user`, `test_uc002_a4_google_login_unregistered_identity` (no corridas esta sesión) | A1 (credenciales inválidas) sin prueba; A3/A4 (Google) implementado, sin ejecutar en Supabase real todavía |
| UC-003 | Implemented | `POST /api/v1/auth/wallet/link` + `verify_wallet_signature`; frontend `app/wallet/page.tsx`, `lib/wallet.ts` (conecta con Rabby/EIP-1193, cambia a HSK Chain testnet, firma) | A: 5 tests de firma (`test_helpers`, `test_wallet`); endpoint y frontend sin prueba automatizada (GAP-027) | Flujo completo (conectar → agregar/cambiar red → firmar → vincular) **verificado manualmente en producción** con Rabby; BR-003 (mensaje de un solo uso) **no aplicado**; A2 sin prueba |
| UC-004 | Implemented | `POST /api/v1/causes` (exige wallet, A2); frontend `app/cause/create/page.tsx`, `lib/causes.ts` (`createCause`)                | A: `test_uc004_uc009_authenticated_flow` (A2, BR-001), `scripts/e2e_*.py`                  | Frontend sin prueba automatizada (GAP-027) ni verificación manual en HSK testnet todavía |
| UC-005 | Implemented | `POST /api/v1/causes/{id}/upload-image`, `GET /causes/{id}/evidence`; frontend `app/cause/create/page.tsx`, `lib/causes.ts` (`uploadCauseImage`)   | A: `TestEvidenceUC005` (A1, A3, BR-001, BR-003, tamaño, firma del archivo)                 | Imagen guardada en tabla `evidences` (Postgres); A2 con otro usuario autenticado sin prueba; frontend sin prueba (GAP-027) |
| UC-006 | Implemented | `services/agent.py`, `tasks.py`                                        | A: `test_agent.py` (20) + `TestAgentCycleUC006` (7) + E2E real en HSK/OpenRouter           | BR-004: huella SHA-256, no CID IPFS. Sin RPC de respaldo (spec ajustada)               |
| UC-007 | Approved    | `GET /api/v1/causes` (filtra `Verified`); frontend `components/CausesSection.tsx`, `lib/causes.ts` (datos reales, `featuredCauses` solo como respaldo sin causas Verified) | A: lista solo causas Verified (`test_uc006_br005…`, `test_uc006_a1…`)                      | No devuelve monto recaudado (BR-002) hasta UC-014; falta la página `/causes` con el listado completo; frontend sin prueba (GAP-027) |
| UC-008 | Approved    | `GET /api/v1/causes/{id}`                                              | P: `test_uc004_uc009_authenticated_flow`                                                                                       | Devuelve causas no verificadas sin marcarlo; sin donaciones ni avance                  |
| UC-009 | Approved    | `POST /api/v1/causes/{id}/donate` (instrucción de firma) + `donate`    | Foundry: `test_TC001_HappyPath`, `test_UC009_DonateWithZeroAmount`                        | El backend no registra la donación (UC-014); sin prueba del endpoint                   |
| UC-010 | Implemented | `CauseVault.withdrawFunds` (sin endpoint, por diseño)                  | Foundry: `test_TC001_HappyPath`, `test_UC010_OnlyRecipientCanWithdraw`                    | `test_TC002_RejectedCauseBlocksFunds` falla (ver GAP-006)                              |
| UC-011 | Approved    | `GET /api/v1/users/me/dashboard` (`app/api/v1/endpoints/users.py`): causas propias + `wallet_address` fresco | P: `test_uc011_a2_a3_dashboard_empty_state_and_wallet_alert`, `test_uc011_br002_dashboard_requires_auth`, `test_uc011_br002_dashboard_only_shows_own_causes` (no corridas esta sesión, ver nota de allowlist arriba) | A2 y A3 implementados y probados (frontend `/dashboard`); A1 (donante sin donaciones) sigue sin implementar porque depende de UC-014 (Draft); BR-001 "por rol" ya no aplica tal cual tras retirar el rol fijo (commit `70745d2`) — pendiente reconciliar el texto del UC |
| UC-012 | Implemented | `CauseVault.pause/unpause/setAgent`                                    | Foundry: `test_UC006_OnlyAgentCanVerify` (indirecto)                                      | Sin pruebas de pausa ni de rotación de agente                                          |
| UC-013 | Implemented | `POST /causes/{id}/publish`, `POST /causes/{id}/publish/confirm`, `services/chain.py`; frontend `app/cause/create/page.tsx`, `lib/wallet.ts` (`publishCauseOnChain`, codifica `createCause` con `viem` y firma con la wallet vinculada) | A: `TestPublishUC013` (A2..A6, BR-002) + E2E real con `createCause` en HSK                | Frontend firma y reintenta la confirmación (A1, A3), pero sin prueba automatizada ni verificación manual en HSK testnet todavía |
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
| GAP-016 | Media     | Frontend sin rutas de UC-008, UC-009 (detalle de causa, donar). Auth (UC-001, UC-002) ya conecta a `/auth/*`; `/dashboard` (UC-011) ya conecta a `GET /users/me/dashboard` y `GET /causes`; wallet (UC-003) ya conecta a `/auth/wallet/link`; `/cause/create` (UC-004, UC-005, UC-013) ya conecta a `POST /causes`, `/publish`, `/publish/confirm` y `/upload-image`; la landing (`CausesSection`) ya lee `GET /causes` con `featuredCauses` solo como respaldo | C-006       |
| GAP-020 | Media     | El SQL Editor / conexión directa de Supabase rechaza la IP de esta máquina de desarrollo (`EADDRNOTALLOWED`); los tests de integración no se pueden correr localmente hasta agregarla al allowlist del proyecto en Supabase | NFR-001 |
| GAP-021 | Resuelta  | `Base.metadata.create_all` no altera columnas existentes: `auth_provider`/`external_id`/`hashed_password NULL` (y el `DROP COLUMN user_type`, ver decisión abajo) en `users` requerían correr `backend/migrations/manual/2026-09-20_google_auth.sql` a mano en Supabase. Ya ejecutada en la BD compartida; sigue pendiente automatizarla con Alembic (GAP-013) | UC-001, UC-002, UC-004 |
| GAP-017 | Media     | `SECRET_KEY` real subido a `main` en el commit de configuración de Render (ya eliminado del árbol, sigue en el historial). Rotar.                   | NFR-008     |
| GAP-018 | Baja      | `venv/` había sido versionado por un `git add -A`; se retira del índice y se agrega a `.gitignore`                                                | C-008       |
| GAP-022 | Media     | El contrato acepta donaciones a causas `Completed` (solo exige `verified`), contradiciendo UC-009 A4; el backend ya no emite la instrucción, pero un cliente puede llamar al contrato directamente | UC-009 A4 |
| GAP-023 | Media     | El RPC de HSK es un balanceador con nodos desfasados: `confirm` puede responder 400 "not confirmed" justo tras firmar; el cliente debe reintentar | UC-014 A4 |
| GAP-024 | Media     | El frontend ya firma `createCause` (UC-013, `lib/wallet.ts`) con la wallet vinculada, codificado con `viem`; todavía no puede firmar `approve`, `donate` ni `withdrawFunds` | FR-024      |
| GAP-025 | Resuelta  | `lib/causes.ts` ahora trae `VerifiedCause` alineado con `CauseListResponse` (`recipient_name`, `image_url`) y `toDisplayCause` adapta snake_case/strings a la forma de `CauseCard`; `featuredCauses` sigue en su forma de muestra, pero solo se usa de respaldo cuando no hay ninguna causa Verified (ver `api_contract.md` §4) | C-006       |
| GAP-026 | Alta      | Faltan las rutas del frontend de UC-008, 009 y 014 (`/cause/[id]`, donar/retirar); UC-004, 005 y 013 (`/cause/create`), UC-011 (`/dashboard`) y UC-003 (`/wallet`) ya están conectados | FR-009..013 |
| GAP-027 | Media     | El frontend no tiene pruebas ni una convención `describe('UC-###')`                                                            | NFR-017     |
| GAP-028 | Resuelta  | La columna `users.user_type` desapareció de Supabase: no era un error, sino la decisión de producto "sin rol fijo por cuenta" (commit `70745d2`, migración manual). El código, las pruebas y los docs se alinearon al modelo sin rol | FR-001      |
| GAP-019 | Baja      | `on_event("shutdown")`, `from_orm` y `datetime.utcnow` están deprecados                                                                            | —           |

---

## 8. Métricas y medidas de éxito

| Métrica | Medido 2026-09-20 | Meta |
|---------|-------------------|------|
| `pytest` (unit + integración) | 96 + 81 = 177 pruebas; 3 omitidas a propósito; 0 fallos | — |
| Cobertura del backend | 92 % (929 líneas, 74 sin cubrir) | ≥ 85 % |
| Cobertura del contrato (líneas) | 88.5 % (54/61) | ≥ 85 % |
| `forge test` | 7 pasan, 2 fallan | 100 % |
| Pruebas de frontend | 0 | ≥ 1 por pantalla ligada a un UC (NFR-017) |
| Endpoints | 17 | — |

| Medida de éxito de la visión | Estado |
|------------------------------|--------|
| Flujo completo demostrable de punta a punta | **Backend y contrato: sí** (scripts reales en testnet). **Con interfaz: no** (TC-005 pendiente por las pantallas) |
| Cobertura superior al 85 % | Sí (92 % backend, 88.5 % contrato) |
| Contrato desplegado y verificable en HSK testnet | Sí |
| Cero fondos donados a causas no verificadas | Sí: el contrato exige `verified` y el backend solo entrega instrucciones para causas `Verified` |
| Un receptor pasa de registro a causa verificada en menos de 5 minutos | Sin medir con interfaz real |

---

## 9. Decisiones vigentes

- Red: HSK Chain testnet (133). Token de pruebas: `MockUSDT` (C-012). BD: Supabase por session pooler (C-010).
- **Sin rol fijo por cuenta:** cualquier usuario puede donar y publicar causas; "Donante" y "Receptor" son roles por caso de uso (glosario).
- Hash de contraseñas: argon2id. Sesión: JWT de 24 h.
- IA: `deepseek/deepseek-v4.1-flash` vía `/chat/completions`, umbral de confianza 0.80, 3 reintentos. Sin revisión humana en el MVP (FR-014 diferido).
- Tareas de fondo: `ThreadPoolExecutor` con barrido al arrancar; ruta a Celery documentada en `backend/TASKS.md`.
- El backend nunca firma por un usuario (C-009): entrega instrucciones de firma y confirma leyendo la cadena.
- Despliegue: Render (backend) y Vercel (frontend); el esquema cambia solo con scripts versionados.
