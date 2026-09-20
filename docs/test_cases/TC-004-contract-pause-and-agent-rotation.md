# Test Case: Contract Pause And Agent Rotation

## Overview

**ID:** TC-004  
**Goal:** El administrador pausa el contrato y se bloquean nuevas causas y donaciones sin bloquear los retiros; tras rotar el agente, solo el nuevo agente puede registrar veredictos  
**Priority:** Medium  
**Status:** Implemented

## Roles

- Administrador (propietario del contrato)
- Donante y Receptor (operan sobre una causa Verified)
- Agente Verificador (anterior y nuevo)

## Preconditions

- Una causa Verified con 100 USDT recaudados (ver TC-001, pasos 1 a 11)
- Una segunda dirección de agente disponible

## Flow

| Step | Name                    | Description                                                            | Test Data                    | Use Case                                              |
|------|-------------------------|------------------------------------------------------------------------|------------------------------|-------------------------------------------------------|
| 1    | Pausar contrato         | El administrador pausa el contrato                                     | -                            | [UC-012](../use_cases/UC-012-administer-contract.md)  |
| 2    | Intentar donar          | El donante intenta donar y es rechazado                                | monto: 10 USDT               | [UC-009](../use_cases/UC-009-donate-to-cause.md)      |
| 3    | Retirar en pausa        | El receptor retira los 100 USDT: los retiros siguen permitidos         | -                            | [UC-010](../use_cases/UC-010-withdraw-funds.md)       |
| 4    | Pausa por no propietario | Una cuenta distinta intenta reanudar y es rechazada                   | cuenta: donante              | [UC-012](../use_cases/UC-012-administer-contract.md)  |
| 5    | Rotar agente            | El administrador designa un nuevo agente                               | nuevo agente de prueba       | [UC-012](../use_cases/UC-012-administer-contract.md)  |
| 6    | Veredicto del agente anterior | El agente anterior intenta registrar un veredicto y es rechazado | verified=true                | [UC-006](../use_cases/UC-006-verify-cause-with-ai.md) |
| 7    | Reanudar contrato       | El administrador reanuda el contrato                                   | -                            | [UC-012](../use_cases/UC-012-administer-contract.md)  |
| 8    | Donar tras reanudar     | El donante dona 5 USDT y la donación se acepta                         | monto: 5 USDT                | [UC-009](../use_cases/UC-009-donate-to-cause.md)      |

## Validation

1. **Bloqueo efectivo**: durante la pausa no se aceptan nuevas causas ni donaciones; los retiros siguen funcionando.
2. **Autoridad**: solo el propietario pausa, reanuda y rota; solo el agente vigente registra veredictos.
3. **Continuidad**: el retiro en pausa transfirió exactamente 100 USDT al receptor, y tras reanudar las donaciones vuelven a aceptarse.

## Postconditions

- El contrato está activo con el nuevo agente y la causa recibió la donación posterior a la pausa

## Automation

Sin automatizar: falta una prueba Foundry de `pause`/`unpause`/`setAgent` (UC-012). Los efectos de `onlyAgent` sobre el agente anterior sí se cubren en `test_UC006_BR001_OnlyAgentCanVerify`.

## Automation

Contrato (Foundry): `test_UC012_BR001_A2_…`, `test_UC012_BR002_PauseBlocksNewCausesAndDonationsButNeverWithdrawals`, `test_UC012_UnpauseRestoresDonations`, `test_UC012_A1_OwnerRotatesAgentAndTheOldOneLosesAuthority`, `test_UC012_A3_BR003_…`.
