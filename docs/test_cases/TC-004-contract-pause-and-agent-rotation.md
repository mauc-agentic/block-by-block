# Test Case: Contract Pause And Agent Rotation

## Overview

**ID:** TC-004  
**Goal:** El administrador pausa el contrato y bloquea donaciones y retiros; tras rotar el agente, solo el nuevo agente puede registrar veredictos  
**Priority:** Medium  
**Status:** Draft

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
| 3    | Intentar retirar        | El receptor intenta retirar y es rechazado                             | -                            | [UC-010](../use_cases/UC-010-withdraw-funds.md)       |
| 4    | Pausa por no propietario | Una cuenta distinta intenta reanudar y es rechazada                   | cuenta: donante              | [UC-012](../use_cases/UC-012-administer-contract.md)  |
| 5    | Rotar agente            | El administrador designa un nuevo agente                               | nuevo agente de prueba       | [UC-012](../use_cases/UC-012-administer-contract.md)  |
| 6    | Veredicto del agente anterior | El agente anterior intenta registrar un veredicto y es rechazado | verified=true                | [UC-006](../use_cases/UC-006-verify-cause-with-ai.md) |
| 7    | Reanudar contrato       | El administrador reanuda el contrato                                   | -                            | [UC-012](../use_cases/UC-012-administer-contract.md)  |
| 8    | Retirar fondos          | El receptor retira los 100 USDT                                        | -                            | [UC-010](../use_cases/UC-010-withdraw-funds.md)       |

## Validation

1. **Bloqueo efectivo**: durante la pausa no cambian los saldos ni se emiten eventos de donación o retiro.
2. **Autoridad**: solo el propietario pausa, reanuda y rota; solo el agente vigente registra veredictos.
3. **Continuidad**: tras reanudar, el retiro transfiere exactamente 100 USDT al receptor.

## Postconditions

- El contrato está activo con el nuevo agente y la causa sin fondos disponibles

## Automation

Sin automatizar: falta una prueba Foundry de `pause`/`unpause`/`setAgent` (UC-012). Los efectos de `onlyAgent` sobre el agente anterior sí se cubren en `test_UC006_OnlyAgentCanVerify`.
