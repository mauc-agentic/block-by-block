# Block by Block — Contexto del proyecto

Plataforma de donaciones peer-to-peer descentralizada (donantes ↔ receptores verificados por IA, dinero directo
on-chain en USDT). Hackathon Ethereum Builders Tour Cali, 19–20 sep 2026. Red: **HSK Chain testnet** (chain id 133).

**Stack:** Solidity ^0.8.24 + Foundry (`CauseVault.sol`) · Python/FastAPI + SQLAlchemy · Agente Python (OpenRouter +
web3.py) · Next.js sobre Scaffold-ETH.

## Metodología: AI Unified Process (AIUP) — SIEMPRE

Todo el trabajo de este proyecto sigue AIUP (plugin `aiup-core`). Antes de tomar decisiones de producto, dominio o
arquitectura, lee:

- `docs/vision.md`
- `docs/requirements.md` (FR-*, NFR-*, C-*)
- `docs/entity_model.md`
- `docs/use_cases.puml` y los `docs/use_cases/UC-*.md` relevantes
- los `docs/test_cases/TC-*.md` relevantes

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

Prefijo de la API: `/api/v1`. Estado real y brechas en `docs/IMPLEMENTATION-STATUS.md`.

| UC     | Caso de uso                   | Backend (FastAPI)                                              | Contrato `CauseVault`                    | Frontend (ruta)                          | Requisitos                        | Status      |
|--------|-------------------------------|----------------------------------------------------------------|------------------------------------------|------------------------------------------|-----------------------------------|-------------|
| UC-001 | Registrar cuenta              | `POST /auth/signup`                                            | —                                        | `/auth/signup` (pendiente)               | FR-001, NFR-006, NFR-007          | Implemented |
| UC-002 | Iniciar sesión                | `POST /auth/login`                                             | —                                        | `/auth/login` (pendiente)                | FR-002, NFR-006, NFR-007          | Implemented |
| UC-003 | Vincular wallet               | `POST /auth/wallet/link`                                       | —                                        | `WalletConnect` (pendiente)              | FR-003                            | Implemented |
| UC-004 | Crear causa                   | `POST /causes`                                                 | `createCause` (sin invocar, ver UC-013)  | `/cause/create` (pendiente)              | FR-004, FR-019                    | Approved    |
| UC-005 | Subir evidencia               | `POST /causes/{id}/upload-image`                               | —                                        | `/cause/create`, `/dashboard/recipient`  | FR-005, FR-006, FR-021            | Approved    |
| UC-006 | Verificar causa con IA        | `services/agent.py` (`verify_cause_with_ai`, `sign_verification_tx`), `tasks.py` | `verifyCause` (`onlyAgent`)  | —                                        | FR-006, FR-007, FR-019, FR-021, FR-022, NFR-003/004/008 | Approved |
| UC-007 | Explorar causas verificadas   | `GET /causes`                                                  | `getCause`, `getCausesCount`             | `/dashboard/donor`; landing con datos de muestra | FR-008, NFR-002          | Approved    |
| UC-008 | Ver detalle de causa          | `GET /causes/{id}`                                             | `getCause`, `getDonationsForCause`       | `/cause/[id]` (pendiente)                | FR-009, NFR-011                   | Approved    |
| UC-009 | Donar                         | `POST /causes/{id}/donate` (instrucción de firma)              | `donate` (+ `approve` del USDT)          | `/cause/[id]` (pendiente)                | FR-010, FR-020, NFR-005/009/011   | Approved    |
| UC-010 | Retirar fondos                | — (solo on-chain)                                              | `withdrawFunds`                          | `/dashboard/recipient` (pendiente)       | FR-011, NFR-005/009/011           | Implemented |
| UC-011 | Ver dashboard                 | **No implementado** (previsto `GET /users/{id}`)               | `getRecipientCauses`, `getDonationsForCause` | `/dashboard/donor`, `/dashboard/recipient` | FR-012, FR-013, FR-020      | Approved    |
| UC-012 | Administrar contrato          | —                                                              | `pause`, `unpause`, `setAgent` (`onlyOwner`) | —                                    | FR-018, NFR-008, NFR-009          | Implemented |
| UC-013 | Publicar causa on-chain       | Por definir (instrucción de firma + enlace `onchain_cause_id`) | `createCause`, evento `CauseCreated`     | `/cause/create`                          | FR-004, FR-019, C-009             | Draft       |
| UC-014 | Registrar donación            | Por definir (validar tx en la red, guardar `Donation`)         | evento `DonationReceived`                | `/cause/[id]`                            | FR-020, FR-009, FR-012, NFR-011   | Draft       |

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

- Enlazar `cause_id` (BD) con `causeId` (on-chain) mediante `onchain_cause_id` → UC-013 (FR-019), sin implementar.
- `withdrawFunds` pone `collected = 0`: definir cómo conservar el total histórico recaudado.
- ~~Validar la firma de wallet con web3.py~~ → resuelto (UC-003 BR-001). Pendiente: mensaje de un solo uso (BR-003).
- Umbral de confianza del agente: 0.80 (UC-006 BR-002).
- Modelo IA: **DeepSeek v4.1 Flash** via OpenRouter (antes Claude 3.5 Sonnet).
- OpenRouter endpoint: `https://openrouter.ai/api/v1/messages` con formato OpenAI-compatible.
- Hash de contraseñas: argon2id (antes bcrypt; NFR-006). BD: Supabase por session pooler (C-010). Token de prueba: `MockUSDT` (C-012).

## Verificación

Tras implementar, ejecutar y reportar: `forge test` + `forge coverage` (contrato), `pytest --cov=app` desde `backend/` (backend),
lint/build del frontend. Cobertura mínima combinada 85 % (NFR-001); medido 2026-09-20: contrato 88.5 %, backend 66 %.
Reportar cualquier verificación que no se pudo completar. Las pruebas de backend corren contra Supabase real (sin SQLite).
