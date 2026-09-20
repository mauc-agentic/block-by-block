# Use Case: View Cause Detail

## Overview

**Use Case ID:** UC-008  
**Use Case Name:** View Cause Detail  
**Primary Actor:** Donante  
**Goal:** Conocer una causa, su avance y sus donaciones antes de donar  
**Status:** Implemented

**Requirements:** [FR-009, NFR-011](../requirements.md)

## Preconditions

- Existe la causa consultada

## Main Success Scenario

1. Donante abre el detalle de una causa.
2. Sistema muestra título, descripción, foto, receptor y estado.
3. Sistema muestra el monto objetivo, el monto recaudado y el porcentaje de avance.
4. Sistema muestra el resultado de la verificación con su confianza.
5. Sistema muestra las donaciones recibidas con enlace a la transacción en el explorador.
6. Sistema ofrece la acción de donar.

## Alternative Flows

### A1: Causa inexistente

**Trigger:** El identificador no corresponde a ninguna causa (step 1)  
**Flow:**

1. Sistema informa que la causa no existe.
2. Use case ends.

### A2: Causa no verificada

**Trigger:** La causa está en Pending o Rejected (step 6)  
**Flow:**

1. Sistema muestra el estado de la causa y no ofrece la acción de donar.
2. Use case ends.

### A3: Causa completada

**Trigger:** El monto recaudado alcanzó el objetivo (step 6)  
**Flow:**

1. Sistema indica que la causa alcanzó su meta.
2. Use case ends.

## Postconditions

### Success Postconditions

- El donante conoce el estado y el historial de la causa

### Failure Postconditions

- _None — la consulta es de solo lectura._

## Business Rules

### BR-001: Transparencia

Cada donación mostrada enlaza a su transacción on-chain para verificación pública.

### BR-002: Donar solo si verificada

La acción de donar solo se ofrece en causas verificadas que no alcanzaron su meta.
