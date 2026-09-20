# Use Case: Browse Verified Causes

## Overview

**Use Case ID:** UC-007  
**Use Case Name:** Browse Verified Causes  
**Primary Actor:** Visitante o Donante  
**Goal:** Descubrir causas verificadas a las que se puede donar  
**Status:** Approved

**Requirements:** [FR-008, NFR-002](../requirements.md)

## Preconditions

- Ninguna: el listado de causas verificadas es de acceso público

## Main Success Scenario

1. Visitante o donante abre el listado de causas.
2. Sistema consulta las causas en estado Verified.
3. Sistema muestra cada causa con título, descripción, nombre del receptor, foto, monto objetivo y monto recaudado.
4. Visitante o donante recorre el listado.
5. Visitante o donante elige una causa.
6. Sistema abre el detalle de la causa (UC-008).

## Alternative Flows

### A1: Sin causas verificadas

**Trigger:** No existe ninguna causa verificada (step 2)  
**Flow:**

1. Sistema muestra únicamente un mensaje indicando que aún no hay causas disponibles; nunca muestra causas de ejemplo como si fueran reales.
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
