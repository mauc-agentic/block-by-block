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

## 6. Registro de brechas (GAP)

Severidad: **Crítica** bloquea el MVP, **Alta** bloquea el flujo demostrable, **Media** riesgo o deuda relevante, **Baja** mejora. Los IDs son estables.

### 6.1 Abiertas

| ID | Severidad | Brecha | Requisito |
|----|-----------|--------|-----------|
| GAP-006 | Alta | Foundry: `test_TC002_RejectedCauseBlocksFunds` espera "no funds to withdraw" pero el contrato revierte con "cause not verified" (correcto según UC-010 A3); `test_GetRecipientCauses` falla por índice fuera de rango | NFR-001 |
| GAP-024 | Alta | El frontend vincula wallet (UC-003 verificado con Rabby) pero no firma `createCause`, `approve`, `donate` ni `withdrawFunds` | FR-024 |
| GAP-026 | Alta | Faltan las pantallas de crear causa (UC-004, 005), publicar (UC-013), detalle (UC-008), donar (UC-009, UC-014) y retirar (UC-010) | FR-004..013 |
| GAP-009 | Media | UC-003 BR-003 (mensaje de un solo uso) no se aplica: la misma firma puede reutilizarse | FR-003 |
| GAP-013 | Media | `Base.metadata.create_all` no altera columnas existentes y `migrations/alembic` está vacío; el esquema cambia con scripts manuales | NFR-013 |
| GAP-014 | Media | Sin logging estructurado ni middleware global de errores; `GET /health` no comprueba base de datos ni RPC | NFR-012 |
| GAP-017 | Media | El `SECRET_KEY` real subido a `main` fue rotado, pero el merge de una rama con historial previo reintrodujo esos commits en `main` | NFR-008 |
| GAP-022 | Media | El contrato acepta donaciones a causas `Completed` (solo exige `verified`), contra UC-009 A4 | FR-010 |
| GAP-023 | Media | El RPC de HSK es un balanceador con nodos desfasados: `confirm` puede responder 400 "not confirmed" justo tras firmar; el cliente debe reintentar | FR-020 |
| GAP-025 | Media | `frontend/lib/causes.ts` tiene datos de muestra con otra forma (camelCase, números) que la API (snake_case, decimales como string) | NFR-016 |
| GAP-027 | Media | El frontend no tiene pruebas ni la convención `describe('UC-###')` | NFR-017 |
| GAP-030 | Media | Sin pruebas Foundry de `pause`, `unpause` ni `setAgent` (UC-012, TC-004) | NFR-001 |
| GAP-031 | Media | NFR-002 (listado < 2 s con 500 causas) y NFR-003 (verificación < 60 s p95) nunca se han medido | NFR-002, NFR-003 |
| GAP-032 | Media | La wallet del agente es la wallet personal de Miguel y la dueña del contrato; su llave privada vive en las variables de Render | NFR-008 |
| GAP-033 | Media | Si la IA rechaza una foto legítima no hay revisión humana ni forma de forzar el veredicto (FR-014 diferido); mitigación: ensayar con `try_ai_verdict` | FR-014 |
| GAP-034 | Media | Si el cliente no llama a `donations/confirm`, la donación existe on-chain pero no en la plataforma ni en el dashboard; falta una reconciliación por eventos | FR-020 |
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
