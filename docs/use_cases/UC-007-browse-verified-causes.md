# Use Case: Browse Verified Causes

## Overview

**Use Case ID:** UC-007  
**Use Case Name:** Browse Verified Causes  
**Primary Actor:** Donante  
**Goal:** Descubrir causas verificadas a las que se puede donar  
**Status:** Draft

**Requirements:** [FR-008, NFR-002](../requirements.md)

## Preconditions

- El donante tiene sesión activa

## Main Success Scenario

1. Donante abre el listado de causas.
2. Sistema consulta las causas en estado Verified.
3. Sistema muestra cada causa con título, foto, monto objetivo y monto recaudado.
4. Donante recorre el listado.
5. Donante elige una causa.
6. Sistema abre el detalle de la causa (UC-008).

## Alternative Flows

### A1: Sin causas verificadas

**Trigger:** No existe ninguna causa verificada (step 2)  
**Flow:**

1. Sistema muestra un mensaje indicando que aún no hay causas disponibles.
2. Use case ends.

## Postconditions

### Success Postconditions

- El donante ve únicamente causas verificadas

### Failure Postconditions

- _None — la consulta es de solo lectura._

## Business Rules

### BR-001: Solo verificadas

El listado nunca incluye causas en estado Pending o Rejected.

### BR-002: Monto recaudado real

El monto recaudado mostrado proviene del contrato, no de un valor local.
