# Use Case: Register Donation

## Overview

**Use Case ID:** UC-014  
**Use Case Name:** Register Donation  
**Primary Actor:** Donante  
**Secondary Actors:** —  
**Goal:** Reflejar en la plataforma una donación confirmada en el contrato  
**Status:** Approved

**Requirements:** [FR-020, FR-009, FR-012, NFR-011](../requirements.md)

## Preconditions

- El donante ejecutó una donación en el contrato (UC-009) y conoce el hash de la transacción
- El donante tiene sesión activa

## Main Success Scenario

1. Donante informa a la plataforma la referencia de su transacción de donación.
2. Sistema consulta la transacción en la red y confirma que existe y fue exitosa.
3. Sistema verifica que la transacción es una donación a la causa indicada desde la wallet del donante.
4. Sistema guarda la donación con causa, donante, monto y referencia de la transacción.
5. Sistema actualiza el avance de la causa y el dashboard del donante.
6. Sistema consulta el estado de la causa en el contrato y, si alcanzó su meta, la marca como Completed.

## Alternative Flows

### A1: Transacción inexistente o fallida

**Trigger:** La red no conoce el hash o la transacción revirtió (step 2)  
**Flow:**

1. Sistema rechaza el registro e indica que la donación no está confirmada.
2. Use case ends.

### A2: Donación ya registrada

**Trigger:** El hash ya existe en la plataforma (step 4)  
**Flow:**

1. Sistema devuelve la donación existente sin duplicarla.
2. Use case ends.

### A3: Transacción ajena

**Trigger:** La transacción no proviene de la wallet vinculada del donante o no es una donación a la causa indicada (step 3)  
**Flow:**

1. Sistema rechaza el registro.
2. Use case ends.

### A4: Confirmación pendiente

**Trigger:** La transacción aún no tiene confirmación de bloque (step 2)  
**Flow:**

1. Sistema informa que debe reintentar más tarde.
2. Use case ends.

## Postconditions

### Success Postconditions

- Existe una donación espejo con hash único ligada a la causa y al donante
- El avance de la causa y el dashboard reflejan el monto
- Si el contrato marcó la causa como Completed, la plataforma también

### Failure Postconditions

- No se crea ninguna donación en la plataforma; los fondos on-chain no se ven afectados

## Business Rules

### BR-001: El contrato es la fuente de verdad

La plataforma solo registra donaciones que el contrato confirmó; nunca crea una donación por afirmación del cliente.

### BR-002: Hash único

Cada hash de transacción se registra una sola vez.

### BR-003: Sin custodia del backend

El registro es de solo lectura sobre la red; el backend no firma ni mueve fondos.

### BR-004: Meta alcanzada

El estado Completed lo decide el contrato al alcanzar la meta; la plataforma solo lo refleja.

### BR-005: Monto recaudado

El monto recaudado que muestra la plataforma es la suma de las donaciones confirmadas, no el saldo retirable del contrato.
