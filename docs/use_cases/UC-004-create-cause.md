# Use Case: Create Cause

## Overview

**Use Case ID:** UC-004  
**Use Case Name:** Create Cause  
**Primary Actor:** Receptor  
**Goal:** Publicar una necesidad con monto objetivo para que sea evaluada  
**Status:** Implemented

**Requirements:** [FR-004, FR-019](../requirements.md)

## Preconditions

- El receptor tiene sesión activa
- El receptor tiene una wallet vinculada (UC-003)

## Main Success Scenario

1. Receptor elige crear una causa.
2. Sistema muestra el formulario con título, descripción y monto objetivo en USDT.
3. Receptor completa los datos.
4. Receptor envía el formulario.
5. Sistema valida los datos.
6. Sistema registra la causa en estado Pending.
7. Receptor firma en su wallet la creación de la causa en el contrato.
8. Sistema enlaza la causa con su identificador on-chain.
9. Sistema dirige al receptor a subir la evidencia (UC-005).

## Alternative Flows

### A1: Datos inválidos

**Trigger:** Título vacío, descripción vacía o monto objetivo menor o igual a cero (step 5)  
**Flow:**

1. Sistema indica los campos inválidos.
2. Use case continues at step 3.

### A2: Receptor sin wallet

**Trigger:** El receptor no tiene wallet vinculada (step 1)  
**Flow:**

1. Sistema dirige al receptor a vincular su wallet (UC-003).
2. Use case ends.

### A3: Firma rechazada

**Trigger:** El receptor cancela la transacción (step 7)  
**Flow:**

1. Sistema conserva la causa como Pending sin identificador on-chain y permite reintentar.
2. Use case ends.

## Postconditions

### Success Postconditions

- Existe una causa en estado Pending asociada al receptor
- La causa existe en el contrato con el mismo receptor y monto objetivo

### Failure Postconditions

- No se crea ninguna causa con identificador on-chain

## Business Rules

### BR-001: Solo receptores

Solo un usuario con rol receptor puede crear causas.

### BR-002: Monto positivo

El monto objetivo debe ser mayor que cero.

### BR-003: Estado inicial

Toda causa nace en estado Pending y no acepta donaciones hasta ser verificada.

### BR-004: Publicación on-chain separada

La causa creada en la plataforma queda Pending hasta que el receptor la publica en el contrato (UC-013); sin esa publicación no puede verificarse.
