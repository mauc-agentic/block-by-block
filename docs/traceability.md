# Traceability Matrix: una sola pieza (frontend + backend + contrato)

Cada caso de uso se realiza en **tres capas** y no se considera terminado hasta que las tres coinciden con su especificación.
Estado auditado el 2026-09-20 contra `main` + rama `backend`. Vocabulario: [glossary.md](glossary.md). Trabajo pendiente del frontend, con criterios de aceptación: [frontend_spec.md](frontend_spec.md). Contrato: [api_contract.md](api_contract.md).
Detalle de brechas: [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md).

**Estado del UC:** `Implemented` solo cuando existen todas las capas que necesita (contrato, backend y pantalla) con pruebas; mientras falte alguna, el UC queda `Approved`
y la columna de la capa pendiente muestra el trabajo por hacer. `Done` exige además la verificación real de la definición de terminado (§4).

Leyenda de estado por capa: **Done** (código + prueba), **Impl** (código, prueba parcial), **Mock** (existe con datos de muestra),
**Open** (no existe), **n/a** (la capa no aplica).

## 1. Casos de uso por capa

| UC | Caso de uso | Backend (API) | Contrato inteligente | Frontend (ruta / archivo) | Back | Contr. | Front |
|----|-------------|---------------|----------------------|---------------------------|------|--------|-------|
| UC-001 | Registrar cuenta | `POST /auth/signup`, `/auth/google/signup` | — | `app/auth/signup/page.tsx`, `components/auth/GoogleButton.tsx`, `lib/auth.ts` | Impl | n/a | Impl |
| UC-002 | Iniciar sesión | `POST /auth/login`, `/auth/google/login` | — | `app/auth/login/page.tsx`, `lib/auth.ts` | Impl | n/a | Impl |
| UC-003 | Vincular wallet | `POST /auth/wallet/link` | — | `app/wallet/page.tsx`, `components/wallet/WalletLinkCard.tsx`, `lib/wallet.ts` | Impl | n/a | Impl |
| UC-004 | Crear causa | `POST /causes` | — | `app/cause/create/page.tsx`, `lib/causes.ts` | Done | n/a | Impl |
| UC-013 | Publicar causa on-chain | `POST /causes/{id}/publish`, `…/publish/confirm` | `createCause`, `CauseCreated` | `app/cause/create/page.tsx` (firma con wallet + reintento de confirmación), `lib/wallet.ts` (`publishCauseOnChain`) | Done | Done | Impl |
| UC-005 | Subir evidencia | `POST /causes/{id}/upload-image`, `GET …/evidence` | — | `app/cause/create/page.tsx`, `lib/causes.ts` (`uploadCauseImage`) | Done | n/a | Impl |
| UC-006 | Verificar causa con IA | `services/agent.py` (automático); `verification_reason`/`verification_confidence` en `CauseResponse`/`DashboardCause` | `verifyCause` | `components/dashboard/MyCauseRow.tsx` (modal con motivo y confianza del veredicto), `components/Modal.tsx` | Done | Done | Impl |
| UC-007 | Explorar causas verificadas | `GET /causes` | — | `components/CausesSection.tsx`, `CauseCard.tsx`, `lib/causes.ts` (datos reales; `featuredCauses` solo si aún no hay ninguna Verified) | Done | n/a | Impl |
| UC-008 | Ver detalle de causa | `GET /causes/{id}` | — | — (`/cause/[id]`) | Done | n/a | Open |
| UC-009 | Donar | `POST /causes/{id}/donate` | `approve`, `donate` | — (`/cause/[id]`) | Done | Impl | Open |
| UC-014 | Registrar donación | `POST /causes/{id}/donations/confirm` | `DonationReceived` | — (reintento tras firmar) | Done | Done | Open |
| UC-010 | Retirar fondos | `POST /causes/{id}/withdraw` | `withdrawFunds` | — (`/dashboard/recipient`) | Done | Impl | Open |
| UC-011 | Ver dashboard | `GET /users/me/dashboard` | `getCause` (saldo) | `app/dashboard/page.tsx`, `components/dashboard/*` | Done | n/a | Impl (muestra causas propias y alerta de wallet; falta sección de donaciones y retiro) |
| UC-012 | Administrar contrato | — | `pause`, `unpause`, `setAgent` | — (sin pantalla) | n/a | Impl (sin pruebas, GAP-030) | n/a |

## 2. Pruebas por capa

| UC | Pruebas de backend | Pruebas de contrato (Foundry) | Pruebas de frontend |
|----|--------------------|-------------------------------|---------------------|
| UC-001, UC-002 | `test_signup_persists_to_supabase`, `test_login_queries_supabase` (+ Google, rama `auth`) | — | Ninguna |
| UC-003 | `test_helpers.py`, `test_wallet.py` (firma) | — | Ninguna |
| UC-004, UC-013 | `TestPublishUC013`, `test_uc004_uc009_authenticated_flow`, `scripts/e2e_verification.py` | `test_UC004_CreateCauseWithZeroAmount` | Ninguna (falta `describe('UC-004 …')` / `describe('UC-013 …')`, GAP-027) |
| UC-005 | `TestEvidenceUC005` | — | Ninguna (GAP-027) |
| UC-006 | `test_agent.py`, `test_uc006_br009_*` (motivo visible), `TestAgentCycleUC006`, `scripts/e2e_verification.py` | `test_UC006_OnlyAgentCanVerify` | n/a |
| UC-007, UC-008 | `test_uc014_registers_donation_and_updates_progress` | `test_GetCausesCount` | Ninguna (GAP-027) |
| UC-009, UC-014 | `TestDonateInstructionUC009`, `TestRegisterDonationUC014`, `test_chain.py`, `scripts/e2e_donation.py` | `test_TC001_HappyPath`, `test_UC009_DonateWithZeroAmount` | Ninguna |
| UC-010 | `scripts/e2e_donation.py` (retiro real) | `test_UC010_OnlyRecipientCanWithdraw` | Ninguna |
| UC-011 | `TestDashboardUC011` | `test_GetRecipientCauses` (falla, GAP-006) | Ninguna |
| UC-012 | — | — (falta, TC-004) | n/a |

## 3. Requisitos de frontend

| Requisito | Estado | Capa que lo realiza |
|-----------|--------|---------------------|
| FR-001, FR-002, FR-023 | Implemented | `app/auth/*`, `lib/auth.ts` |
| FR-003 | Verified (verificado manualmente en producción con Rabby; sin prueba automatizada de frontend, GAP-027) | `app/wallet/*`, `lib/wallet.ts` |
| FR-004, FR-005, FR-019, FR-021 | Implemented (sin prueba de frontend, GAP-027) | `app/cause/create/page.tsx`, `lib/causes.ts`, `lib/wallet.ts` |
| FR-008 (vista de muestra en landing) | Implemented; falta la página `/causes` con el listado completo | `components/CausesSection.tsx`, `lib/causes.ts` |
| FR-009…FR-013, FR-024 | Open | Frontend (backend y contrato ya listos) |
| NFR-010 Diseño responsivo (360 px) | Deferred | Frontend |
| NFR-016 Coherencia front/back | Implemented | `api_contract.md` generado + `test_api_contract_doc` |
| NFR-017 Pruebas de frontend | Open | Frontend |
| C-006 Next.js sobre Scaffold-ETH | Deferred | Next.js 16 sin Scaffold-ETH; wallet conectada directo vía EIP-1193 (Rabby), no con wagmi/RainbowKit |

## 4. Definición de terminado (por caso de uso)

Un UC pasa a `Done` solo si se cumplen **todas**:

1. `docs/use_cases/UC-###.md` en estado ≥ Reviewed y validado (`validate_use_case.py`).
2. El contrato (`api_contract.md`) refleja sus endpoints; el bloque generado está al día (`test_api_contract_doc` verde).
3. Backend implementado, con al menos una prueba por cada Alternative Flow y Business Rule.
4. Contrato inteligente y sus pruebas Foundry, si el UC toca la cadena.
5. Frontend con la ruta/componente, comentario `// UC-###` y prueba `describe('UC-### …')`.
6. Términos y estados tomados de [glossary.md](glossary.md), sin variantes.
7. Verificado de punta a punta en HSK testnet (script `e2e_*` o journey TC-###) y estado actualizado aquí y en `IMPLEMENTATION-STATUS.md`.
