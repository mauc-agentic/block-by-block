# Use Case: Reconcile Donations

## Overview

**Use Case ID:** UC-016  
**Use Case Name:** Reconcile Donations  
**Primary Actor:** Sistema  
**Secondary Actors:** Donante  
**Goal:** Registrar en la plataforma las donaciones confirmadas en el contrato que el donante no llegó a registrar  
**Status:** Implemented

**Requirements:** [FR-027, FR-020, NFR-011](../requirements.md)

## Preconditions

- El contrato tiene donaciones confirmadas que la plataforma no ha registrado
- La wallet donante está vinculada a una cuenta de la plataforma

## Main Success Scenario

1. Sistema consulta las donaciones confirmadas en el contrato desde la última revisión.
2. Sistema identifica las que no están registradas en la plataforma.
3. Sistema asocia cada una con su causa y con la cuenta cuya wallet vinculada la realizó.
4. Sistema registra cada donación con su monto y su referencia de transacción.
5. Sistema actualiza el avance de las causas y los resúmenes de los donantes.

## Alternative Flows

### A1: Donación sin cuenta

**Trigger:** Ninguna cuenta tiene vinculada la wallet donante (step 3)  
**Flow:**

1. Sistema omite la donación y la deja sin registrar.
2. Use case continues at step 3 con la siguiente donación.

### A2: Donación a una causa desconocida

**Trigger:** La causa on-chain no corresponde a ninguna causa de la plataforma (step 3)  
**Flow:**

1. Sistema omite la donación.
2. Use case continues at step 3 con la siguiente donación.

### A3: Contrato no disponible

**Trigger:** La red no responde al consultar las donaciones (step 1)  
**Flow:**

1. Sistema registra el fallo y reintenta en la siguiente ejecución.
2. Use case ends.

## Postconditions

### Success Postconditions

- Toda donación del contrato con cuenta y causa conocidas queda registrada exactamente una vez
- El avance de las causas incluye esas donaciones

### Failure Postconditions

- No se registra ninguna donación parcial ni duplicada

## Business Rules

### BR-001: Idempotencia

Cada referencia de transacción se registra una sola vez, sin importar cuántas veces se ejecute la revisión ni si el donante ya la había registrado (UC-014).

### BR-002: El contrato es la fuente de verdad

Solo se registran donaciones que el contrato confirmó; nunca se crea una donación por afirmación de un cliente.

### BR-003: Sin custodia

La revisión es de solo lectura sobre la red; el sistema no firma ni mueve fondos.
