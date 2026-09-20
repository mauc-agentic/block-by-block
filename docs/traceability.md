# Traceability Matrix: una sola pieza (frontend + backend + contrato)

Cada caso de uso se realiza en **tres capas** y no se considera terminado hasta que las tres coinciden con su especificación.
Estado auditado el 2026-09-20 contra `main` + rama `backend`. Vocabulario: [glossary.md](glossary.md). Trabajo pendiente del frontend, con criterios de aceptación: [frontend_spec.md](frontend_spec.md). Qué falta de cada UC y decisiones abiertas: [use_case_audit.md](use_case_audit.md). Contrato: [api_contract.md](api_contract.md).
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
| UC-007 | Explorar causas verificadas | `GET /causes` | — | `app/causes/page.tsx`, `components/CausesSection.tsx`, `CauseListCard.tsx`, `lib/api.ts` (solo datos reales; vacío = mensaje) | Done | n/a | Impl (`tests/causes-list.test.tsx`) |
| UC-008 | Ver detalle de causa | `GET /causes/{id}` | — | `app/cause/[id]/page.tsx`, `RetryVerification.tsx` | Done | n/a | Impl (`tests/cause-detail.test.tsx`) |
| UC-009 | Donar | `POST /causes/{id}/donate` | `approve`, `donate` | `components/DonateBlock.tsx`, `lib/pendingDonations.ts`, `PendingDonationsNotice.tsx` | Done | Impl | Impl (`tests/donate.test.tsx`) |
| UC-014 | Registrar donación | `POST /causes/{id}/donations/confirm` | `DonationReceived` | — (reintento tras firmar) | Done | Done | Open |
| UC-015 | Cerrar sesión | — | — | `components/Header.tsx`, `app/dashboard/page.tsx` (botón "Cerrar sesión") | n/a | n/a | Impl |
| UC-016 | Reconciliar donaciones | `services/reconcile.py` (arranque, cada 10 min y `scripts/reconcile_donations.py`) | evento `DonationReceived` | — | Impl (falta correr sus pruebas contra la BD) | Done | n/a |
| UC-010 | Retirar fondos | `POST /causes/{id}/withdraw` | `withdrawFunds` | `components/dashboard/MyCauseRow.tsx` (retirar) | Done | Impl | Impl (`tests/dashboard.test.tsx`) |
| UC-011 | Ver dashboard | `GET /users/me/dashboard` | `getCause` (saldo) | `app/dashboard/page.tsx`, `components/dashboard/*` | Done | n/a | Impl (causas propias, mis donaciones, retirar, alerta de wallet; `tests/dashboard.test.tsx`) |
| UC-012 | Administrar contrato | — | `pause`, `unpause`, `setAgent` | — (sin pantalla) | n/a | Done | n/a |

## 2. Pruebas por capa

| UC | Pruebas de backend | Pruebas de contrato (Foundry) | Pruebas de frontend |
|----|--------------------|-------------------------------|---------------------|
| UC-001, UC-002 | `test_uc001_signup_persists_to_supabase`, `test_uc002_login_queries_supabase` (+ Google, rama `auth`) | — | Ninguna |
| UC-003 | `test_helpers.py`, `test_wallet.py` (firma) | — | Ninguna |
| UC-004, UC-013 | `TestPublishUC013`, `test_uc004_a2_br003_authenticated_create_flow`, `scripts/e2e_verification.py` | `test_UC004_BR002_CreateCauseWithZeroAmountReverts` | Ninguna (falta `describe('UC-004 …')` / `describe('UC-013 …')`, GAP-027) |
| UC-005 | `TestEvidenceUC005` | — | `tests/causes-list.test.tsx`, `tests/cause-detail.test.tsx` |
| UC-006 | `test_agent.py`, `test_uc006_br009_*` (motivo visible), `TestAgentCycleUC006`, `scripts/e2e_verification.py` | `test_UC006_BR001_OnlyAgentCanVerify` | n/a |
| UC-007, UC-008 | `test_uc014_registers_donation_and_updates_progress` | `test_GetCausesCount` | `tests/causes-list.test.tsx`, `tests/cause-detail.test.tsx` |
| UC-009, UC-014 | `TestDonateInstructionUC009`, `TestRegisterDonationUC014`, `test_chain.py`, `scripts/e2e_donation.py` | `test_TC001_HappyPath`, `test_UC009_BR003_DonateWithZeroAmountReverts` | `tests/donate.test.tsx` |
| UC-010 | `scripts/e2e_donation.py` (retiro real) | `test_UC010_BR001_A2_OnlyRecipientCanWithdraw` | `tests/dashboard.test.tsx` |
| UC-011 | `TestDashboardUC011` | `test_GetRecipientCauses` | `tests/dashboard.test.tsx` |
| UC-012 | — | `test_UC012_*` (5 pruebas Foundry, TC-004) | n/a |

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
| NFR-019 Idiomas ES/EN | Implemented | `lib/i18n/` (es.ts, en.ts, content.ts), `LanguageSwitcher`, `tests/i18n.test.tsx` |
| NFR-018 Identidad visual | In Progress | `design_system.md`; migración de `globals.css` y componentes pendiente |
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
