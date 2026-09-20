# Test Case: Live End-to-End With Real Users

## Overview

**ID:** TC-005  
**Goal:** Con cuentas y wallets reales, un usuario publica una causa que la IA aprueba, otro usuario la financia, el primero recibe el dinero y la causa refleja el avance, todo desde la interfaz desplegada  
**Priority:** Critical  
**Status:** Draft

## Roles

- Usuario A (receptor): publica la causa y retira. En esta prueba: Miguel.
- Usuario B (donante): dona. En esta prueba: Carlos.
- Agente Verificador (automático)

## Preconditions

- Frontend en Vercel y backend en Render desplegados con el último `main`; `NEXT_PUBLIC_API_URL` termina en `/api/v1`; el origen del frontend está en `ALLOWED_ORIGINS`
- Ambos usuarios tienen sesión (correo o Google) y **wallet vinculada** (UC-003)
- Ambas wallets tienen HSK de prueba para gas; la wallet del donante tiene MockUSDT (token `0xD6D6fbbcAe342788DCC18fF2b1cd692c8b8837ec`; se fondea con `python -m scripts.fund_wallet --user <nombre> --usdt 100`)
- La wallet del agente tiene HSK para firmar el veredicto
- Foto de evidencia real y coherente con la descripción de la causa, ensayada antes contra la IA con `python -m scripts.try_ai_verdict foto.jpg --description "…" --runs 3` (debe aprobarse las 3 veces)

## Flow

| Step | Name | Description | Test Data | Use Case |
|------|------|-------------|-----------|----------|
| 1 | Crear causa | A crea la causa desde la interfaz | título y descripción reales, objetivo: 10 USDT | [UC-004](../use_cases/UC-004-create-cause.md) |
| 2 | Publicar en el contrato | A firma `createCause` con su wallet; la interfaz confirma con reintentos | -- | [UC-013](../use_cases/UC-013-publish-cause-onchain.md) |
| 3 | Subir evidencia | A sube la foto; se encola la verificación | foto real (JPEG/PNG, < 5 MB) | [UC-005](../use_cases/UC-005-upload-cause-evidence.md) |
| 4 | Esperar el veredicto | La interfaz muestra "En revisión" hasta que el estado cambia; si pasan ~2 min ofrece "Reintentar" | -- | [UC-006](../use_cases/UC-006-verify-cause-with-ai.md) |
| 5 | Ver la causa verificada | B abre el listado y encuentra la causa | -- | [UC-007](../use_cases/UC-007-browse-verified-causes.md) |
| 6 | Ver detalle | B abre el detalle: avance 0 % | -- | [UC-008](../use_cases/UC-008-view-cause-detail.md) |
| 7 | Donar | B firma `approve` y `donate` | monto: 3 USDT | [UC-009](../use_cases/UC-009-donate-to-cause.md) |
| 8 | Registrar la donación | La interfaz confirma con reintentos hasta que la plataforma la registra | tx de la donación | [UC-014](../use_cases/UC-014-register-donation.md) |
| 9 | Ver el avance | A y B ven recaudado 3 de 10 USDT (30 %) en detalle y dashboard | -- | [UC-008](../use_cases/UC-008-view-cause-detail.md), [UC-011](../use_cases/UC-011-view-dashboard.md) |
| 10 | Retirar | A firma `withdrawFunds` y recibe el dinero | -- | [UC-010](../use_cases/UC-010-withdraw-funds.md) |

## Validation

1. **Estado**: la causa pasa de Pending a Verified en menos de 60 s tras subir la evidencia; su verificación tiene un hash de transacción visible en el explorador.
2. **Fondos**: el saldo de MockUSDT de A aumenta exactamente 3 y el de B baja exactamente 3.
3. **Avance**: el detalle muestra recaudado 3.000000 de 10.000000 USDT; el dashboard de B lista la donación y `total_donated` = 3; el dashboard de A muestra `collected` = 3 y `available_to_withdraw` = 0 tras retirar.
4. **Meta**: al donar los 7 USDT restantes, la causa pasa a Completed y sale del listado.
5. **Auditoría**: existen en el explorador los eventos `CauseCreated`, `CauseVerified`, `DonationReceived` y `FundsWithdrawn` de la causa.
6. **Sin custodia**: el backend nunca firmó una transacción de A ni de B (C-009).

## Postconditions

- Existe una causa Completed (o con avance parcial), con una donación registrada y sus fondos retirados
