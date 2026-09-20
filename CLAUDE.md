# Block by Block — Contexto del proyecto

Plataforma de donaciones peer-to-peer descentralizada (donantes ↔ receptores verificados por IA, dinero directo
on-chain en USDT). Hackathon Ethereum Builders Tour Cali, 19–20 sep 2026. Red: **HSK Chain testnet** (chain id 133).

**Stack:** Solidity ^0.8.24 + Foundry (`CauseVault.sol`) · Python/FastAPI + SQLAlchemy · Agente Python (OpenRouter +
web3.py) · Next.js sobre Scaffold-ETH.

## Equipo

Dos personas: **Miguel Uribe** (backend, contrato inteligente y AIUP) y **Carlos Andres Uribe** (frontend). En el historial de git Carlos Andres aparece con dos
nombres de autor, «Carlos Andres Uribe» y «Andres uribe»: es **la misma persona**. Cuentas de prueba: `miguelangeluribe` y `carlos andres uribe castaneda`.

## Metodología: AI Unified Process (AIUP) — SIEMPRE

Todo el trabajo de este proyecto sigue AIUP (plugin `aiup-core`). Antes de tomar decisiones de producto, dominio o
arquitectura, lee:

- `docs/vision.md`
- `docs/glossary.md` (lenguaje común: usar SIEMPRE estos términos, en interfaz y en código)
- `docs/api_contract.md` (contrato único front/back/contrato; el bloque de endpoints y esquemas se genera desde el código)
- `docs/traceability.md` (estado por capa de cada UC y definición de terminado)
- `docs/frontend_spec.md` (qué debe construir el frontend para el flujo completo, con criterios de aceptación y guion de la prueba de punta a punta)
- `docs/requirements.md` (FR-*, NFR-*, C-*)
- `docs/entity_model.md`
- `docs/use_cases.puml` y los `docs/use_cases/UC-*.md` relevantes
- los `docs/test_cases/TC-*.md` relevantes

## Una sola pieza: frontend + backend + contrato

Las tres capas son **un único producto** que habla el mismo idioma y avanza junto:

1. **Un cambio empieza en el UC** (o en `requirements.md`), luego se refleja en `api_contract.md` y `glossary.md`, y después en las capas.
2. **Cambio de API:** se edita el código y se regenera el contrato con `cd backend && python -m scripts.generate_api_contract`.
   La prueba `test_api_contract_doc` falla si `docs/api_contract.md` no coincide con la API real. Avisar al frontend del cambio.
3. **Vocabulario:** solo términos de `glossary.md`. Estados de causa idénticos en API, BD, contrato y TypeScript
   (`Pending`, `Verified`, `Rejected`, `Completed`); la traducción ocurre solo al mostrarlos.
4. **Montos** viajan como string decimal de 6 decimales; **JSON en snake_case**; el frontend adapta a camelCase en su cliente.
5. **Un UC está terminado** solo si cumple la definición de `traceability.md` §4 (spec, contrato, back con pruebas,
   contrato inteligente, front con `// UC-###` y `describe('UC-###')`, verificación real en HSK testnet).
6. **El frontend no firma con el backend ni el backend por el usuario** (C-009): el backend entrega instrucciones de firma y
   confirma leyendo la cadena; el frontend firma con la wallet y reintenta la confirmación (RPC con nodos desfasados).
7. **Base de datos compartida (Supabase):** todo cambio de esquema es un script versionado en `backend/migrations/manual/`
   avisado al equipo; nadie altera tablas a mano. Las IP de cada desarrollador y de Render deben estar en *Network Restrictions*.

### Flujo y skills

```text
Inception          Elaboration                             Construction
/requirements  →  /entity-model  →  /use-case-diagram  →  /use-case-spec  →  /test-case
```

### Reglas

1. Los requerimientos se derivan de la visión. Si cambia un requerimiento, reconcilia entidades y diagrama.
2. **No se implementa un caso de uso sin su `UC-*.md` revisado** (Status ≥ Reviewed). Nuevo comportamiento ⇒ primero
   `/use-case-spec`, luego código.
3. Los IDs (FR, NFR, C, UC, TC, BR) son **estables**: nunca se renumeran ni reutilizan tras publicarse.
4. Trazabilidad obligatoria en código y pruebas (ver «Convención de trazabilidad»).
5. Cambios upstream (visión, requerimientos) ⇒ actualizar los documentos downstream en el mismo cambio.
6. Los documentos generados se revisan y versionan como código; no son artefactos desechables.
7. Actualiza el `Status` del UC (`Draft → Reviewed → Approved → Implemented → Tested → Done`) y el del FR
   (`Open → In Progress → Implemented → Verified`) al avanzar. `/coverage-check` audita cobertura de especificación.
8. Formato de UC normativo: `~/.claude/plugins/marketplaces/ai-unified-process-marketplace/aiup-core/skills/use-case-spec/references/format-spec.md`
   (validador: `.../use-case-spec/scripts/validate_use_case.py`). Encabezados en inglés, contenido en español, sin
   términos de implementación en los pasos.

> No hay plugin AIUP para Solidity/FastAPI. `aiup-vaadin-jooq` está habilitado en `.claude/settings.json` pero **no
> aplica** a este stack: no usar sus skills `implement`, `karibu-test`, `playwright-test`, etc.

## Mapa de rutas: UC → implementación

Prefijo de la API: `/api/v1`. Estado por capa en `docs/traceability.md`; brechas en `docs/IMPLEMENTATION-STATUS.md`.

| UC     | Caso de uso                   | Backend (FastAPI)                                              | Contrato `CauseVault`                    | Frontend (ruta)                          | Requisitos                        | Status      |
|--------|-------------------------------|----------------------------------------------------------------|------------------------------------------|------------------------------------------|-----------------------------------|-------------|
| UC-001 | Registrar cuenta              | `POST /auth/signup`, `POST /auth/google/signup` (A3)           | —                                        | `/auth/signup`                           | FR-001, NFR-006, NFR-007          | Implemented |
| UC-002 | Iniciar sesión                | `POST /auth/login`, `POST /auth/google/login` (A3)             | —                                        | `/auth/login`                            | FR-002, NFR-006, NFR-007          | Implemented |
| UC-003 | Vincular wallet               | `POST /auth/wallet/link`                                       | —                                        | `/wallet` (conecta Rabby/EIP-1193, cambia a HSK Chain, firma) | FR-003                            | Implemented |
| UC-004 | Crear causa                   | `POST /causes` (publicación on-chain: UC-013)                  | `createCause`                            | `/cause/create` (pendiente)              | FR-004, FR-019                    | Implemented    |
| UC-005 | Subir evidencia              | `POST /causes/{id}/upload-image`, `GET /causes/{id}/evidence`  | —                                        | `/cause/create`, `/dashboard/recipient`  | FR-005, FR-006, FR-021            | Implemented    |
| UC-006 | Verificar causa con IA        | `services/agent.py` (`verify_cause_with_ai`, `sign_verification_tx`, `verify_cause_task`), `tasks.py` | `verifyCause` (`onlyAgent`) | —                                        | FR-006, FR-007, FR-019, FR-021, FR-022, NFR-003/004/008 | Implemented |
| UC-007 | Explorar causas verificadas   | `GET /causes`                                                  | `getCause`, `getCausesCount`             | `/dashboard` (real); landing con datos de muestra | FR-008, NFR-002          | Approved    |
| UC-008 | Ver detalle de causa          | `GET /causes/{id}`                                             | `getCause`, `getDonationsForCause`       | `/cause/[id]` (pendiente)                | FR-009, NFR-011                   | Approved    |
| UC-009 | Donar                         | `POST /causes/{id}/donate` (instrucción de firma)              | `donate` (+ `approve` del USDT)          | `/cause/[id]` (pendiente)                | FR-010, FR-020, NFR-005/009/011   | Approved    |
| UC-010 | Retirar fondos                | `POST /causes/{id}/withdraw` (instrucción de firma)     | `withdrawFunds`                          | `/dashboard/recipient` (pendiente)       | FR-011, NFR-005/009/011           | Approved    |
| UC-011 | Ver dashboard                 | `GET /users/me/dashboard` (causas propias con saldo retirable, donaciones, `wallet_linked`) | `getCause` (saldo retirable)        | `/dashboard` (ruta protegida por JWT en localStorage) | FR-012, FR-013, FR-020      | Approved    |
| UC-012 | Administrar contrato          | —                                                              | `pause`, `unpause`, `setAgent` (`onlyOwner`) | —                                    | FR-018, NFR-008, NFR-009          | Approved    |
| UC-013 | Publicar causa on-chain       | `POST /causes/{id}/publish`, `POST /causes/{id}/publish/confirm` (`services/chain.py`) | `createCause`, evento `CauseCreated` | `/cause/create` (firma pendiente)        | FR-004, FR-019, C-009             | Implemented    |
| UC-014 | Registrar donación            | `POST /causes/{id}/donations/confirm`                          | evento `DonationReceived`                | `/cause/[id]`                            | FR-020, FR-009, FR-012, NFR-011   | Approved    |

Test cases (journeys end-to-end): **TC-001** flujo feliz receptor→donante→retiro (UC-001,003,004,013,005,006,007,008,009,014,011,010) ·
**TC-002** causa rechazada bloquea fondos (UC-004,005,006,007,009,010) · **TC-003** fallo del proveedor de IA deja la causa Pending
(UC-005,006,007,009) · **TC-004** pausa del contrato y rotación de agente (UC-012,009,010,006).

Estructura de código real:

```text
contracts/   src/CauseVault.sol · src/MockUSDT.sol · script/Deploy.s.sol · test/CauseVault.t.sol   (Foundry)
backend/     app/{api/v1/endpoints,core,db,schemas,services,utils}/ · tests/{unit,integration}/ · abi/CauseVault.json · Dockerfile
frontend/    app/ · components/ · lib/                                (Next.js 16, sin Scaffold-ETH todavía)
docs/        artefactos AIUP + IMPLEMENTATION-STATUS.md
render.yaml · DEPLOYMENT.md · TESTING_STATUS.md
```

## Convención de trazabilidad

- **Solidity:** NatSpec `/// @custom:uc UC-009 BR-001` en cada función externa; errores/require con el mensaje de la BR.
- **Foundry:** `test_UC009_BR001_RevertsWhenCauseNotVerified()`; journeys `test_TC001_HappyPath()`.
- **Python:** docstring o comentario `# UC-006 BR-002`; tests `test_uc006_br002_rejects_low_confidence`.
- **Frontend:** comentario `// UC-009` en la página/hook; tests `describe('UC-009 ...')`.
- **Commits/PRs:** mencionar los IDs (`feat(UC-009): donate flow`).
- Cada `Alternative Flow` (A*) y cada `Business Rule` (BR-*) debe tener al menos una prueba.

## Reglas específicas del dominio (de la visión y restricciones)

- El backend **nunca** custodia fondos ni firma transacciones de usuarios (C-009). Solo el agente firma `verifyCause`.
- Comisión de plataforma 0 % (NFR-005). USDT con 6 decimales (`amount * 1e6`).
- Secretos (`AGENT_PRIVATE_KEY`, `OPENROUTER_API_KEY`, `SECRET_KEY`, credenciales Supabase) solo por variables de
  entorno; **jamás** en el repo, ni siquiera en `.env.example` o en documentación (NFR-008). Nunca `git add -A`: `venv/` y `.env` no se versionan.
- Solo causas `Verified` reciben donaciones y permiten retiros.

## Red y explorador

| Concepto | Valor |
|----------|-------|
| **RPC** | https://testnet.hsk.xyz |
| **Chain ID** | 133 |
| **Explorer** | https://testnet-explorer.hskchain.net/ |
| **Faucet HSK** | https://hskchain.net/faucet |

## Decisiones abiertas (ver `docs/vision.md` → Riesgos)

- Enlazar `cause_id` (BD) con `causeId` (on-chain) mediante `onchain_cause_id` → resuelto con UC-013 (FR-019).
- `withdrawFunds` pone `collected = 0`: definir cómo conservar el total histórico recaudado.
- ~~Validar la firma de wallet con web3.py~~ → resuelto (UC-003 BR-001). ~~Conectar la wallet desde el frontend~~ → resuelto
  y verificado manualmente en producción (`/wallet`, Rabby/EIP-1193; sin prueba automatizada de frontend, GAP-027).
  Pendiente: mensaje de un solo uso (BR-003).
- Umbral de confianza del agente: 0.80 (UC-006 BR-002).
- Modelo IA: **DeepSeek v4.1 Flash** via OpenRouter (antes Claude 3.5 Sonnet).
- OpenRouter endpoint: `https://openrouter.ai/api/v1/chat/completions` (formato OpenAI-compatible; `/messages` devuelve formato Anthropic y rompe el parseo).
- Hash de contraseñas: argon2id (antes bcrypt; NFR-006). BD: Supabase por session pooler (C-010). Token de prueba: `MockUSDT` (C-012).

## Verificación

Tras implementar, ejecutar y reportar: `forge test` + `forge coverage` (contrato), `pytest --cov=app` desde `backend/` (backend),
lint/build del frontend. Cobertura mínima combinada 85 % (NFR-001); medido 2026-09-20: contrato 88.5 %, backend 71 %. Pruebas reales de punta a punta (gastan HSK testnet): `cd backend && python -m scripts.e2e_verification` y `python -m scripts.e2e_donation`.
Reportar cualquier verificación que no se pudo completar. Las pruebas de backend corren contra Supabase real (sin SQLite).
