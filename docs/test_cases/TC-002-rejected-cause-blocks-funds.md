# Test Case: Rejected Cause Blocks Funds

## Overview

**ID:** TC-002  
**Goal:** Una causa que la IA rechaza no aparece para donantes, no recibe donaciones y no permite retiros  
**Priority:** High  
**Status:** Draft

## Roles

- Receptor (crea la causa y sube evidencia dudosa)
- Donante (intenta encontrar y financiar la causa)
- Agente Verificador (rechaza la causa)

## Preconditions

- Contrato `CauseVault` desplegado con el agente autorizado
- Un donante registrado con wallet vinculada y 50 USDT de prueba (ver TC-001, pasos 7 y 8)
- Un receptor registrado con wallet vinculada (ver TC-001, pasos 1 y 2)
- El proveedor de IA está simulado con veredicto negativo

## Flow

| Step | Name                     | Description                                                          | Test Data                                                               | Use Case                                                |
|------|--------------------------|----------------------------------------------------------------------|-------------------------------------------------------------------------|---------------------------------------------------------|
| 1    | Crear causa              | El receptor publica una necesidad                                    | título: Ayuda urgente, descripción: Incendio en mi casa, objetivo: 300 USDT | [UC-004](../use_cases/UC-004-create-cause.md)           |
| 2    | Subir foto sospechosa    | El receptor sube una imagen que no corresponde a la descripción      | foto: paisaje.jpg (JPEG, 1 MB)                                          | [UC-005](../use_cases/UC-005-upload-cause-evidence.md)  |
| 3    | Rechazar causa           | El agente registra el veredicto negativo                             | veredicto: verified=false, confianza: 0.90                              | [UC-006](../use_cases/UC-006-verify-cause-with-ai.md)   |
| 4    | Explorar causas          | El donante no ve "Ayuda urgente" en el listado                       | -                                                                       | [UC-007](../use_cases/UC-007-browse-verified-causes.md) |
| 5    | Intentar donar           | El donante intenta donar a la causa por su identificador y es rechazado | monto: 50 USDT                                                       | [UC-009](../use_cases/UC-009-donate-to-cause.md)        |
| 6    | Intentar retirar         | El receptor intenta retirar y es rechazado                           | -                                                                       | [UC-010](../use_cases/UC-010-withdraw-funds.md)         |

## Validation

1. **Estado final**: la causa figura como Rejected con el motivo del rechazo.
2. **Sin movimiento de fondos**: el saldo de USDT del donante no cambia y el contrato no recibe fondos para la causa.
3. **Sin evento de donación**: no existe ningún evento de donación para la causa.

## Postconditions

- Existe una causa Rejected sin donaciones ni retiros
