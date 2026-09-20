# Test Case: AI Provider Failure Keeps Cause Pending

## Overview

**ID:** TC-003  
**Goal:** Si el proveedor de IA no responde o devuelve una respuesta inválida, la causa permanece Pending, no admite donaciones y puede reintentarse  
**Priority:** High  
**Status:** Implemented

## Roles

- Receptor (crea la causa y sube evidencia)
- Donante (intenta donar)
- Agente Verificador (falla al evaluar)

## Preconditions

- Contrato `CauseVault` desplegado con el agente autorizado
- Un receptor registrado con wallet vinculada y una causa publicada (ver TC-001, pasos 1 a 3.1)
- Un donante registrado con wallet vinculada (ver TC-001, pasos 7 y 8)
- El proveedor de IA está simulado: primero no responde y luego devuelve texto que no es un veredicto

## Flow

| Step | Name                      | Description                                                              | Test Data                                   | Use Case                                                |
|------|---------------------------|--------------------------------------------------------------------------|---------------------------------------------|---------------------------------------------------------|
| 1    | Subir foto                | El receptor sube la evidencia y se encola la verificación                | foto: techo.jpg (JPEG, 1 MB)                | [UC-005](../use_cases/UC-005-upload-cause-evidence.md)  |
| 2    | Agotar reintentos         | El proveedor no responde en 3 intentos y el agente registra el fallo     | proveedor: sin respuesta                    | [UC-006](../use_cases/UC-006-verify-cause-with-ai.md)   |
| 3    | Verificar estado          | La causa sigue Pending y el fallo queda registrado                       | -                                           | -                                                       |
| 4    | Explorar causas           | El donante no ve la causa en el listado                                  | -                                           | [UC-007](../use_cases/UC-007-browse-verified-causes.md) |
| 5    | Intentar donar            | El donante intenta donar por identificador y es rechazado                | monto: 20 USDT                              | [UC-009](../use_cases/UC-009-donate-to-cause.md)        |
| 6    | Respuesta ilegible        | Al reintentar, el proveedor devuelve texto que no es un veredicto        | respuesta: "no puedo analizar"              | [UC-006](../use_cases/UC-006-verify-cause-with-ai.md)   |
| 7    | Verificar estado          | La causa sigue Pending sin veredicto on-chain                            | -                                           | -                                                       |

## Validation

1. **Estado final**: la causa permanece Pending y no figura como Verified ni Rejected.
2. **Sin veredicto on-chain**: el contrato no emite evento de verificación para la causa.
3. **Sin movimiento de fondos**: el saldo del donante no cambia.
4. **Confianza cero**: el fallo no se interpreta como aprobación (umbral 0.80, UC-006 BR-002).

## Postconditions

- Existe una causa Pending sin veredicto, sin donaciones y disponible para reintentar la verificación

## Automation

- `test_uc006_a3_ai_unavailable_keeps_pending`, `test_uc006_a5_onchain_failure_keeps_pending`, `test_uc006_br006_without_evidence_nothing_happens` (BD real, IA y cadena simuladas).
- `tests/unit/test_agent.py`: 3 reintentos, respuesta ilegible (A4), timeout, umbral 0.80 y huella del veredicto.
