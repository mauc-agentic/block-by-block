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

| UC     | Caso de uso                  | Backend (FastAPI)                                   | Contrato `CauseVault`                    | Frontend (ruta)                     | Requisitos                     |
|--------|------------------------------|-----------------------------------------------------|------------------------------------------|-------------------------------------|--------------------------------|
| UC-001 | Registrar cuenta             | `POST /auth/signup`                                 | —                                        | `/auth/signup`                      | FR-001, NFR-006, NFR-007       |
| UC-002 | Iniciar sesión               | `POST /auth/login`                                  | —                                        | `/auth/login`                       | FR-002, NFR-006, NFR-007       |
| UC-003 | Vincular wallet              | `POST /wallet/link`                                 | —                                        | `WalletConnect` (componente)        | FR-003                         |
| UC-004 | Crear causa                  | `POST /causes`                                      | `createCause`                            | `/cause/create`                     | FR-004                         |
| UC-005 | Subir evidencia              | `POST /causes/{id}/upload-image`                    | —                                        | `/cause/create`, `/dashboard/recipient` | FR-005, FR-006             |
| UC-006 | Verificar causa con IA       | `agent.py` (`verify_cause_image`, `sign_verification_tx`) | `verifyCause` (`onlyAgent`)         | —                                   | FR-006, FR-007, NFR-003/004/008 |
| UC-007 | Explorar causas verificadas  | `GET /causes`                                       | `getCause`, `getCausesCount`             | `/dashboard/donor`                  | FR-008, NFR-002                |
| UC-008 | Ver detalle de causa         | `GET /causes/{id}`                                  | `getCause`, `getDonationsForCause`       | `/cause/[id]`                       | FR-009, NFR-011                |
| UC-009 | Donar                        | `POST /causes/{id}/donate` (instrucción de firma)   | `donate` (+ `approve` del USDT)          | `/cause/[id]`                       | FR-010, NFR-005/009/011        |
| UC-010 | Retirar fondos               | —                                                   | `withdrawFunds`                          | `/dashboard/recipient`              | FR-011, NFR-005/009/011        |
| UC-011 | Ver dashboard                | `GET /user/{id}`                                    | `getRecipientCauses`, `getDonationsForCause` | `/dashboard/donor`, `/dashboard/recipient` | FR-012, FR-013      |

Test cases (journeys end-to-end): **TC-001** flujo feliz receptor→donante→retiro (UC-001,003,004,005,006,007,008,009,011,010) ·
**TC-002** causa rechazada bloquea fondos (UC-004,005,006,007,009,010).

Estructura de código prevista (crear cuando se implemente):

```text
contracts/   src/CauseVault.sol · script/Deploy.s.sol · test/*.t.sol   (Foundry)
backend/     main.py · models.py · agent.py · abi/CauseVault.json · tests/   (FastAPI)
frontend/    app/ · components/ · hooks/                                (Next.js Scaffold-ETH)
docs/        artefactos AIUP
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
  entorno; **jamás** en el repo (NFR-008). Usa `.env.local` para desarrollo.
- Solo causas `Verified` reciben donaciones y permiten retiros.

## Red y explorador

| Concepto | Valor |
|----------|-------|
| **RPC** | https://testnet.hsk.xyz |
| **Chain ID** | 133 |
| **Explorer** | https://testnet-explorer.hskchain.net/ |
| **Faucet HSK** | https://hskchain.net/faucet |

## Decisiones abiertas (ver `docs/vision.md` → Riesgos)

- Enlazar `cause_id` (BD) con `causeId` (on-chain) mediante `onchain_cause_id`.
- `withdrawFunds` pone `collected = 0`: definir cómo conservar el total histórico recaudado.
- Validar la firma de wallet con web3.py (hoy es un TODO en el spec técnico).
- Umbral de confianza del agente: 0.80 (UC-006 BR-002).
- El spec original llama a `https://openrouter.ai/api/v1/messages`; OpenRouter usa formato OpenAI-compatible en
  `/api/v1/chat/completions` (imágenes como `image_url`). Confirmar con la doc actual antes de implementar UC-006.

## Verificación

Tras implementar, ejecutar y reportar: `forge test --coverage` (contrato), `pytest --cov` (backend), lint/build del
frontend. Cobertura mínima combinada 85 % (NFR-001). Reportar cualquier verificación que no se pudo completar.
