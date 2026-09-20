# Use Case: Donate To Cause

## Overview

**Use Case ID:** UC-009  
**Use Case Name:** Donate To Cause  
**Primary Actor:** Donante  
**Goal:** Enviar una donación en stablecoin directamente al contrato de la causa  
**Status:** Approved

**Requirements:** [FR-010, NFR-005, NFR-009, NFR-011, FR-020, FR-024, FR-025](../requirements.md)

## Preconditions

- El donante tiene sesión activa y una wallet vinculada (UC-003)
- La causa está en estado Verified
- La wallet del donante tiene saldo suficiente de USDT y de gas

## Main Success Scenario

1. Donante elige donar en el detalle de una causa (UC-008).
2. Sistema solicita el monto de la donación.
3. Donante ingresa el monto.
4. Sistema valida el monto y muestra el resumen de la donación.
5. Donante autoriza en su wallet el uso del monto de USDT por el contrato.
6. Donante firma en su wallet la donación.
7. Contrato bloquea el monto en la causa y emite el evento de donación.
8. Sistema actualiza el monto recaudado y registra la donación.
9. Sistema confirma la donación al donante con enlace a la transacción.

## Alternative Flows

### A1: Monto inválido

**Trigger:** El monto es cero, negativo o no numérico (step 4)  
**Flow:**

1. Sistema indica que el monto debe ser mayor que cero.
2. Use case continues at step 3.

### A2: Saldo insuficiente

**Trigger:** El saldo de USDT no alcanza para el monto (step 4)  
**Flow:**

1. Sistema informa el saldo disponible.
2. Use case continues at step 3.

### A3: Transacción rechazada

**Trigger:** El donante cancela en su wallet o la transacción falla (step 6)  
**Flow:**

1. Sistema informa que la donación no se realizó y que no se cobró ningún monto.
2. Use case ends.

### A4: Causa completada

**Trigger:** La donación hace que el recaudado alcance o supere el objetivo (step 7)  
**Flow:**

1. Contrato marca la causa como Completed.
2. Use case continues at step 8.

### A5: Causa no verificada

**Trigger:** La causa no está en estado Verified (step 6)  
**Flow:**

1. Contrato rechaza la donación.
2. Sistema informa que la causa no acepta donaciones.
3. Use case ends.

### A6: Cuenta activa distinta de la vinculada

**Trigger:** La wallet activa no es la vinculada a la cuenta del donante (step 5)  
**Flow:**

1. Sistema no permite firmar e indica que debe usar la wallet vinculada a su cuenta.
2. Use case ends.

### A7: Red incorrecta

**Trigger:** La wallet no está en la red de la plataforma (step 5)  
**Flow:**

1. Sistema solicita cambiar a la red de la plataforma.
2. Use case continues at step 5.

## Postconditions

### Success Postconditions

- La donación puede reflejarse en la plataforma mediante UC-014
- El contrato retiene el monto donado a favor de la causa
- El monto recaudado de la causa aumenta en el monto donado
- Existe un registro de la donación con donante, monto y fecha
- Se emite el evento público de donación

### Failure Postconditions

- No se transfiere ningún monto
- El monto recaudado de la causa no cambia

## Business Rules

### BR-001: Solo causas verificadas

El contrato solo acepta donaciones a causas verificadas.

### BR-002: Sin comisión

El 100 % del monto donado queda disponible para el receptor.

### BR-003: Monto positivo

El monto de la donación debe ser mayor que cero.

### BR-004: Sin custodia del backend

La donación se firma en la wallet del donante; el backend nunca firma ni mueve fondos.
