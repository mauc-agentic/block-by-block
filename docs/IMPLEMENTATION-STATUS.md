# Implementation Status — Block by Block

**Auditado:** 2026-09-20 contra `main` (contrato, backend, frontend, despliegue) ejecutando `pytest --cov`, `forge test`/`forge coverage` y las pruebas reales de punta a punta.
**Stack:** Solidity ^0.8.24 + Foundry · FastAPI + Supabase (session pooler) · DeepSeek v4.1 Flash vía OpenRouter · Next.js 16 · HSK testnet (133).
**Equipo:** Miguel Uribe (backend, contrato y AIUP) y Carlos Andres Uribe (frontend). En git Carlos Andres aparece como «Carlos Andres Uribe» y «Andres uribe»: es la misma persona; "Carlos" en las pruebas es su cuenta de usuario (`carlos andres uribe castaneda`).
**Cómo leer este documento:** frontend, backend y contrato son **una sola pieza** (ver [vision.md](vision.md)). El estado por capa de cada UC está en
[traceability.md](traceability.md), el vocabulario en [glossary.md](glossary.md) y el contrato de API en [api_contract.md](api_contract.md).
La sección 2 se **genera** de los propios documentos (`cd backend && python -m scripts.aiup_summary`); una prueba falla si se desactualiza.

---

## 1. Resumen ejecutivo

- **Backend y contrato están completos para el flujo principal** y verificados de punta a punta en HSK testnet con dinero de prueba real:
  crear causa → publicar on-chain → evidencia → IA → veredicto on-chain → listado → donar → registrar → dashboard → retirar.
- **El frontend tiene** landing con causas reales, autenticación (correo y Google), vinculación de wallet con Rabby, crear causa, listado, **detalle de causa** (con sondeo del veredicto y reintento),
  **donar** (`approve` + `donate` con recuperación de donaciones pendientes), dashboard con **retirar** y mis donaciones, el design system EAG × ETH × HSK y los idiomas ES/EN. Falta **ejecutar TC-005
  en vivo** con dos personas y sus wallets para darlo por verificado.
- **Calidad:** backend 119 pruebas unitarias + 109 de integración contra Supabase (3 omitidas a propósito), cobertura de líneas **92 %** (meta 85 %); contrato **17/17** pruebas Foundry con 100 % de líneas;
  frontend **69** pruebas Vitest, con lint y build en verde.
- **Riesgos abiertos principales:** ejecutar TC-005 en vivo con las pantallas nuevas del frontend, wallet del agente = wallet personal (GAP-032),
  secreto rotado que sigue en el historial de `main` (GAP-017).

---

## 2. Resumen generado desde los documentos AIUP

<!-- BEGIN SUMMARY -->
### Casos de uso

| UC | Caso de uso | Estado |
|----|-------------|--------|
| UC-001 | Register Account | Implemented |
| UC-002 | Log In | Implemented |
| UC-003 | Link Wallet | Implemented |
| UC-004 | Create Cause | Implemented |
| UC-005 | Upload Cause Evidence | Implemented |
| UC-006 | Verify Cause With AI | Implemented |
| UC-007 | Browse Verified Causes | Approved |
| UC-008 | View Cause Detail | Approved |
| UC-009 | Donate To Cause | Approved |
| UC-010 | Withdraw Funds | Approved |
| UC-011 | View Dashboard | Approved |
| UC-012 | Administer Contract | Implemented |
| UC-013 | Publish Cause On-Chain | Implemented |
| UC-014 | Register Donation | Approved |
| UC-015 | Log Out | Reviewed |
| UC-016 | Reconcile Donations | Implemented |

### Casos de prueba (journeys)

| TC | Journey | Estado |
|----|---------|--------|
| TC-001 | Recipient To Donor Happy Path | Implemented |
| TC-002 | Rejected Cause Blocks Funds | Implemented |
| TC-003 | AI Provider Failure Keeps Cause Pending | Implemented |
| TC-004 | Contract Pause And Agent Rotation | Implemented |
| TC-005 | Live End-to-End With Real Users | Approved |

### Requisitos por estado

| Tipo | Verified | Implemented | In Progress | Open | Deferred | Total |
|------|----------|-------------|-------------|------|----------|-------|
| Funcionales (FR) | 9 | 4 | 9 | 1 | 4 | 27 |
| No funcionales (NFR) | 0 | 9 | 5 | 3 | 2 | 19 |
| Restricciones (C) | 0 | 10 | 2 | 0 | 1 | 13 |

Requisitos aún no terminados:

- **FR-008** Explorar causas — In Progress
- **FR-009** Detalle de causa — In Progress
- **FR-010** Donar — In Progress
- **FR-011** Retirar fondos — In Progress
- **FR-012** Dashboard de donante — In Progress
- **FR-013** Dashboard de receptor — In Progress
- **FR-020** Registrar donación — In Progress
- **FR-024** Wallet en el navegador — In Progress
- **FR-025** Seguimiento de transacciones — Open
- **FR-026** Cerrar sesión — In Progress
- **NFR-002** Latencia de listado — In Progress
- **NFR-003** Tiempo de verificación — In Progress
- **NFR-008** Secretos fuera del repo — In Progress
- **NFR-012** Observabilidad — Open
- **NFR-013** Migraciones versionadas — Open
- **NFR-015** Disponibilidad del servicio — In Progress
- **NFR-017** Pruebas de frontend — Open
- **NFR-018** Identidad visual — In Progress
- **C-007** Plazo — In Progress
- **C-011** Despliegue backend — In Progress

### Brechas

| Crítica | Alta | Media | Baja | Abiertas | Resueltas | Total |
|---------|------|-------|------|----------|-----------|-------|
| 0 | 0 | 10 | 3 | 13 | 28 | 41 |
<!-- END SUMMARY -->

---

## 3. Estado por componente

| Componente | Estado real |
|------------|-------------|
| **Contrato `CauseVault`** | Desplegado en HSK testnet. Foundry: **17 de 17 pruebas pasan**; cobertura de líneas **100 %**, ramas 78.8 %. Sin cambios de código: la pausa no bloquea retiros y se documentó así (D9). Sigue abierto GAP-022 (donar sobre la meta). |
| **Backend FastAPI** | 17 endpoints: auth (correo y Google), wallet, causas, publicar y confirmar, evidencia, reintento de verificación, donar y confirmar, dashboard. **Desplegado en Render**; la última versión con `POST /causes/{id}/verify` está en `main` y pendiente de redespliegue. |
| **Agente IA (UC-006)** | Ciclo cerrado y verificado en real: IA → veredicto on-chain → estado de la causa. Reintento manual, barrido al arrancar y una verificación a la vez por causa. Ensayo previo de una foto con `try_ai_verdict`. |
| **Frontend Next.js** | Rutas: `/`, `/faq`, `/terms`, `/auth/login`, `/auth/signup`, `/wallet`, `/dashboard`, `/cause/create`. La landing lista causas verificadas reales. Firma `createCause` con Rabby y confirma con reintentos. Sin `/cause/[id]`, sin firma de `approve`/`donate`/`withdrawFunds` y **sin pruebas**. Desplegado en Vercel. |
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
- Landing con causas verificadas reales, FAQ, términos, autenticación (correo y Google), vinculación de wallet con Rabby verificada en vivo, dashboard protegido con alerta de wallet.
- **Crear causa** (`/cause/create`): formulario, subida de foto y publicación on-chain firmando `createCause` con la wallet, con confirmación por reintentos (UC-004, UC-005, UC-013; Carlos Andres, PR #8).
- **Motivo del veredicto de IA** (UC-006): `CauseResponse`/`DashboardCause` ahora exponen `verification_reason` y `verification_confidence` (tabla `verifications`, antes solo en Postgres); el dashboard (`MyCauseRow`) muestra un botón "Ver por qué se rechazó"/"Ver motivo de la IA" que abre un modal (`components/Modal.tsx`) con el motivo y la confianza del modelo.

**Verificado en real (HSK testnet)**
- **Con usuarios reales desde la interfaz (2026-09-20):** Carlos creó la causa #348 "MacStudio para mi" en `/cause/create`: firmó `createCause` con su wallet (id on-chain 7), subió la foto y la IA real la **rechazó** (confianza 0.90; motivo: no evidencia una necesidad real) con el veredicto confirmado en la cadena (tx `0xae57df55…d20c`). Valida UC-004, UC-005, UC-013 y UC-006 con cuentas reales y el caso TC-002 (causa rechazada fuera del listado).
- Causa rechazada por la IA real (motivo coherente) y verificada con veredicto simulado; donación de 3 USDT con `approve` + `donate` desde una wallet distinta, registro,
  dashboards y retiro del receptor (+3.0 USDT). Carlos ya tiene 100 MockUSDT para la prueba con usuarios reales.

---

## 5. Pendiente (backlog priorizado)

### P0 — Para correr TC-005 (flujo real Miguel → Carlos)

Especificación detallada de cada pantalla, con criterios de aceptación y orden de PR: [frontend_spec.md](frontend_spec.md) (S1..S6).

| # | Tarea | Responsable | Brecha |
|---|-------|-------------|--------|
| 1 | ~~Pantalla **crear causa** con subida de foto~~ **Hecho y verificado en vivo** (`/cause/create`, causa #348 de Carlos) | Frontend | GAP-026 |
| 2 | ~~**Publicar** en el contrato: firmar `createCause`~~ **Hecho y verificado en vivo** (id on-chain 7) | Frontend | GAP-024 |
| 3 | ~~Pantalla de **detalle** (`/cause/[id]`; hoy 404 en Vercel) con estado (esperar el veredicto), barra de avance y donaciones, y botón "Reintentar verificación" ~~ **Hecho en código** (S2, con pruebas; falta verificar en vivo) | Frontend | GAP-026 |
| 4 | ~~**Donar**: `approve` + `donate` con Rabby, `confirm` con reintentos y hash guardado en `localStorage`~~ **Hecho en código** (S3, con pruebas; falta verificar en vivo) | Frontend | GAP-024, GAP-023 |
| 5 | ~~**Retirar** (`withdrawFunds(onchain_cause_id)`) y añadir MockUSDT a Rabby (`wallet_watchAsset`)~~ **Hecho en código** (S4, con pruebas; falta verificar en vivo) | Frontend | GAP-024 |
| 6 | **Crear la causa de la demo con una necesidad genuina y ensayar su foto** con `try_ai_verdict` (3 de 3 aprobadas): la IA ya rechazó una petición sin necesidad real (#348), y una causa Rechazada no se puede reintentar | Miguel | GAP-033 |
| 7 | ~~**Redesplegar Render** con el último `main`~~ **Hecho** (`/verify`, `/donate`, `/donations/confirm` y `/users/me/dashboard` desplegados); falta despertar el servicio antes de la demo | Miguel / Carlos Andres | GAP-035 |
| 8a | **Donación de demostración hecha** (10 USDT de Miguel a la causa #352 con `scripts/donate.py`, on-chain confirmada); falta registrarla con la sesión de Miguel (`donations/confirm`) hasta que exista la pantalla de donar | Miguel | GAP-024 |
| 8 | **Ejecutar TC-005 en vivo** y guardar la evidencia (hashes y capturas); depende de 3, 4 y 5 y de una causa Verified | Todos | — |
| 8b | ~~**Exponer el veredicto** en la API y mostrarlo en el dashboard~~ **Hecho** (Carlos Andres, `de02450`: `verification_reason` y `verification_confidence` + modal "Ver por qué se rechazó"; prueba `test_uc006_br009_*`). No se expone el hash de la tx del veredicto | Backend / Frontend | GAP-037 |

### P1 — Antes de dar el MVP por cerrado

Auditoría de especificación de los 14 UC (qué falta implementar, probar y ajustar, y 8 decisiones abiertas): [use_case_audit.md](use_case_audit.md).

| # | Tarea | Responsable | Brecha |
|---|-------|-------------|--------|
| 9a | **Decidir D1..D8 del audit** (re-vincular wallet, causas de muestra en la landing, visibilidad de causas no verificadas, límites del contrato…) y reflejarlas en los UC antes de tocar código | Equipo | GAP-040, GAP-041 |
| 9 | Corregir las 2 pruebas Foundry y agregar las de pausa y rotación de agente | Contrato | GAP-006, GAP-030 |
| 10 | Bloquear donaciones a causas `Completed` en el contrato | Contrato | GAP-022 |
| 11 | ~~Reconciliar donaciones on-chain que el cliente no confirmó~~ **Hecho** (UC-016; 109 pruebas de integración pasan) | Backend | GAP-034 |
| 12 | Separar la wallet del agente de la personal y de la dueña del contrato | Miguel | GAP-032 |
| 13 | ~~Mensaje de un solo uso para vincular wallet (UC-003 BR-003)~~ **Hecho** | Backend | GAP-009 |
| 14 | Decidir si se reescribe otra vez el historial de `main` (secreto rotado reintroducido por un merge) | Equipo | GAP-017 |

### P2 — Endurecimiento

Alembic (GAP-013), logging estructurado y middleware de errores (GAP-014), pruebas de frontend (GAP-027), adaptar `lib/causes.ts` al contrato (GAP-025),
medir NFR-002 y NFR-003 (GAP-031), deprecaciones (GAP-019), límite de tasa (NFR-014, diferido), revisión humana de rechazos (FR-014, diferido; GAP-033).

---

## 6. Registro de brechas (GAP)

Severidad: **Crítica** bloquea el MVP, **Alta** bloquea el flujo demostrable, **Media** riesgo o deuda relevante, **Baja** mejora. Los IDs son estables.

### 6.1 Abiertas

| ID | Severidad | Brecha | Requisito |
|----|-----------|--------|-----------|
| GAP-024 | Resuelta | El frontend firma `approve`, `donate` y `withdrawFunds` (`sendContractTx`, `waitForReceipt`, `DonateBlock`, `MyCauseRow`); pruebas Vitest con wallet simulada. Falta ejecutar TC-005 en vivo | FR-024 |
| GAP-026 | Resuelta | Pantallas `/causes`, `/cause/[id]` (con donar y sondeo), dashboard con retirar y donaciones (S1–S5 de `frontend_spec.md`); falta ejecutar TC-005 en vivo | FR-008..011 |
| GAP-009 | Resuelta | UC-003 BR-003: cada mensaje firmado sirve una sola vez (`wallet_messages`, hash único; el mensaje se consume aunque el vínculo se rechace); pruebas contra Supabase | FR-003 |
| GAP-013 | Media | `Base.metadata.create_all` no altera columnas existentes y `migrations/alembic` está vacío; el esquema cambia con scripts manuales | NFR-013 |
| GAP-014 | Media | Sin logging estructurado ni middleware global de errores; `GET /health` no comprueba base de datos ni RPC | NFR-012 |
| GAP-017 | Media | El `SECRET_KEY` real subido a `main` fue rotado, pero el merge de una rama con historial previo reintrodujo esos commits en `main` | NFR-008 |
| GAP-022 | Media | El contrato acepta donaciones a causas `Completed` (solo exige `verified`), contra UC-009 A4 | FR-010 |
| GAP-023 | Media | El RPC de HSK es un balanceador con nodos desfasados: `confirm` puede responder 400 "not confirmed" justo tras firmar; el cliente debe reintentar | FR-020 |
| GAP-025 | Resuelta | `lib/api.ts` con tipos alineados a la API (snake_case, decimales como string); se eliminaron los datos de muestra y `Cause`/`toDisplayCause` | NFR-016 |
| GAP-027 | Resuelta | Vitest + Testing Library + MSW: 63 pruebas con `describe('UC-###')` / `it('S#-#')` (`npm test`) | NFR-017 |
| GAP-031 | Media | NFR-002 (listado < 2 s con 500 causas) no se ha medido; NFR-003 (verificación < 60 s p95) solo tiene muestras sueltas en vivo: 12 s, 16 s, 37 s y 61 s desde la subida de la foto, la última por encima de la meta | NFR-002, NFR-003 |
| GAP-032 | Media | La wallet del agente es la wallet personal de Miguel y la dueña del contrato; su llave privada vive en las variables de Render | NFR-008 |
| GAP-033 | Media | Si la IA rechaza una foto legítima no hay revisión humana ni forma de forzar el veredicto (FR-014 diferido); mitigación: ensayar con `try_ai_verdict` | FR-014 |
| GAP-034 | Resuelta | UC-016: `services/reconcile.py` lee los eventos `DonationReceived` al arrancar, cada 10 min y con `scripts/reconcile_donations.py`, idempotente por hash; además el frontend recupera pendientes (FR-025) | FR-020 |
| GAP-038 | Media | El veredicto de la IA varía entre ejecuciones con la misma foto y descripción (0.90 y 0.70 el 2026-09-20) y las causas aprobadas quedan cerca del umbral 0.80 (0.85); una causa Rechazada no se puede reintentar. Mitigación: ensayar 3 veces con `try_ai_verdict` y describir lugar, fecha y daño | FR-006, FR-014 |
| GAP-039 | Media | Una verificación en Render no produjo veredicto (causa #353): la tarea se perdió o falló sin dejar rastro y el barrido de arranque no la recuperó; sin logs accesibles ni métricas de la cola | FR-006, NFR-012 |
| GAP-040 | Resuelta | Decisión D1 aplicada: con causas publicadas la wallet no cambia (UC-003 A5/BR-004, `POST /auth/wallet/link`); sin causas sí; probado contra Supabase | FR-003, FR-011 |
| GAP-041 | Resuelta | La landing ya no muestra causas de muestra: solo causas reales o el mensaje de vacío (D2) | FR-008 |
| GAP-035 | Baja | El plan gratuito de Render duerme y tarda ~50 s en despertar | NFR-015 |
| GAP-036 | Baja | iCloud Drive sincroniza el Escritorio y crea copias de archivos con sufijo ` 2`, ` 3` que pueden pisar código | — |
| GAP-019 | Baja | `on_event`, `from_orm` y `datetime.utcnow` están deprecados | — |

### 6.2 Resueltas

| ID | Estado | Brecha y resolución | Requisito |
|----|--------|---------------------|-----------|
| GAP-001 | Resuelta | El agente nunca actualizaba `Cause.status`; ahora fija Verified/Rejected tras confirmar el veredicto on-chain (UC-006 BR-005) | FR-022 |
| GAP-002 | Resuelta | El agente evaluaba una imagen fija de 1×1 px; ahora guarda y evalúa la foto real (tabla `evidences`) | FR-021 |
| GAP-003 | Resuelta | `createCause` no se invocaba; UC-013 (`publish` y `publish/confirm`) enlaza `onchain_cause_id` leyendo el evento | FR-019 |
| GAP-004 | Resuelta | Sin dashboard; `GET /users/me/dashboard` cubre UC-011 (causas, donaciones, saldo retirable) | FR-012, FR-013 |
| GAP-005 | Resuelta | Nadie escribía en `donations`; UC-014 registra donaciones leyendo `DonationReceived` | FR-020 |
| GAP-007 | Resuelta | Cobertura del backend 66 %; ahora 92 % | NFR-001 |
| GAP-008 | Resuelta | Se habían borrado las pruebas de auth al retirar SQLite; hay equivalentes contra Supabase | FR-001..003 |
| GAP-010 | Resuelta | UC-006 A5 prometía RPC de respaldo; la spec ahora pide 3 reintentos | FR-007 |
| GAP-011 | Resuelta | `Verification.cause_id` único; decidido 1:1 con actualización de la fila | FR-006 |
| GAP-012 | Resuelta | `verification_hash` simulado; ahora es el SHA-256 del veredicto canónico, registrado on-chain | UC-006 BR-004 |
| GAP-015 | Resuelta | `get_current_user` devolvía la función `get_db`: todo endpoint autenticado daba 500; corregido con `_db_session` y prueba de regresión | UC-004..009 |
| GAP-016 | Resuelta | Absorbida por GAP-024, GAP-025 y GAP-026 (mismo tema con detalle) | C-006 |
| GAP-018 | Resuelta | `venv/` versionado por un `git add -A`; sale del índice y entra en `.gitignore` | C-008 |
| GAP-020 | Resuelta | Supabase rechazaba la IP local (`address not in tenant allow_list`); cada desarrollador agrega su IP en *Network Restrictions* (ver `DEPLOYMENT.md`) | NFR-015 |
| GAP-021 | Resuelta | `create_all` no altera columnas; la migración de Google se aplicó como script manual versionado | NFR-013 |
| GAP-028 | Resuelta | La columna `users.user_type` desapareció por la decisión de producto "sin rol fijo por cuenta"; código, pruebas y documentos se alinearon | FR-001 |
| GAP-037 | Resuelta | La API no exponía el motivo del veredicto: una causa Rechazada aparecía sin explicación para su titular; ahora `verification_reason` y `verification_confidence` viajan en el detalle y el dashboard, y la interfaz los muestra en un modal (UC-006 BR-009) | FR-009, FR-013 |
| GAP-006 | Resuelta | Foundry: las 2 pruebas que fallaban eran errores de las pruebas (mensaje esperado equivocado y `vm.prank` de una sola llamada); corregidas. Contrato: 17 pruebas pasan, 100 % de líneas | NFR-001 |
| GAP-030 | Resuelta | Sin pruebas de pausa, reanudar ni rotación de agente: ahora hay 5 pruebas `test_UC012_*` y TC-004 automatizado | NFR-001 |
| GAP-029 | Resuelta | Si Render reiniciaba a mitad de una verificación, la causa quedaba Pending; hay barrido al arrancar, reintento del titular y control de duplicados | UC-006 |

---

## 7. Hallazgos e incidentes (lo que salió y la regla que dejó)

| Hallazgo | Consecuencia | Regla derivada |
|----------|--------------|----------------|
| OpenRouter `/messages` responde en formato Anthropic, sin `choices` | El agente rechazaba todas las causas | Probar el proveedor con una llamada real antes de dar por hecho el parseo |
| El agente usaba una imagen fija y nunca cambiaba el estado de la causa | El ciclo de verificación no cerraba | Un UC no está terminado sin un E2E real (`scripts/e2e_*`) |
| Un cambio mío en `get_current_user` rompió todo endpoint autenticado y las pruebas que lo cubrían ya no existían | 500 en producción durante un tiempo | No borrar pruebas sin reemplazo; regresión obligatoria |
| `passlib` 1.7 incompatible con `bcrypt` 5 y bcrypt corta a 72 bytes | El registro fallaba | Argon2id (NFR-006); fijar versiones probadas en `requirements.txt` |
| Secreto y `venv/` subidos al repositorio; un merge reintrodujo los commits reescritos | Rotación y reescritura de historial | Nunca `git add -A`; escaneo de secretos antes del push; avisar antes de reescribir historial |
| Render usaba Python 3.14 (sin wheels, compilaba Rust en un disco de solo lectura) | El build fallaba | Fijar `PYTHON_VERSION` y `.python-version` |
| El RPC de HSK es un balanceador con nodos desfasados | Lecturas justo tras una tx pueden fallar | Reintentar en el cliente y leer con espera (GAP-023) |
| Dos verificaciones simultáneas usaban el mismo nonce del agente | Transacciones colisionaban | Nonce `pending` y bloqueo de envío |
| Un contrato ajeno podía emitir eventos con la misma firma | Se podían falsificar publicaciones y donaciones | Aceptar solo eventos emitidos por la dirección de `CauseVault` |
| Decisión de producto sin rol fijo implicó quitar una columna de la base compartida | Pruebas y código fallaban sin aviso | Todo cambio de esquema es un script versionado en `migrations/manual/` con aviso al equipo |
| Un merge sustituyó el dashboard del backend por otra versión con contrato distinto | Dos contratos para lo mismo | Contrato único generado del código y probado (`api_contract.md`); revisar conflictos add/add |
| `NEXT_PUBLIC_API_URL` sin el prefijo `/api/v1` en Vercel (por un consejo mío erróneo) | Login con Google daba 404 | La variable define la base **con** `/api/v1`; documentado en el contrato |
| iCloud crea copias ` 2` al sincronizar el Escritorio | Copias viejas pisaban código | Mantener el repositorio fuera de carpetas sincronizadas (GAP-036) |

---

## 8. Métricas y medidas de éxito

| Métrica | Medido 2026-09-20 | Meta |
|---------|-------------------|------|
| `pytest` (unit + integración) | 96 + 81 = 177 pruebas; 3 omitidas a propósito; 0 fallos | — |
| Cobertura del backend | 92 % (929 líneas, 74 sin cubrir) | ≥ 85 % |
| Cobertura del contrato (líneas) | 100 % (61/61) | ≥ 85 % |
| `forge test` | 17 pasan, 0 fallan | 100 % |
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
