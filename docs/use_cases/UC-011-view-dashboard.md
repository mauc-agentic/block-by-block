# Use Case: View Dashboard

## Overview

**Use Case ID:** UC-011  
**Use Case Name:** View Dashboard  
**Primary Actor:** Donante  
**Secondary Actors:** Receptor  
**Goal:** Ver un resumen personal según el rol del usuario  
**Status:** Approved

**Requirements:** [FR-012, FR-013, FR-020](../requirements.md)

## Preconditions

- El usuario tiene sesión activa

## Main Success Scenario

1. Usuario abre su dashboard.
2. Sistema identifica el rol del usuario.
3. Sistema muestra el resumen correspondiente al rol.
4. Usuario recorre la información.
5. Usuario elige una acción disponible (explorar causas, crear causa o retirar fondos).

## Alternative Flows

### A1: Donante sin donaciones

**Trigger:** El donante no ha donado aún (step 3)  
**Flow:**

1. Sistema muestra un mensaje invitando a explorar causas.
2. Use case continues at step 5.

### A2: Receptor sin causas

**Trigger:** El receptor no ha creado causas (step 3)  
**Flow:**

1. Sistema muestra un mensaje invitando a crear su primera causa.
2. Use case continues at step 5.

### A3: Wallet no vinculada

**Trigger:** El usuario no tiene wallet vinculada (step 3)  
**Flow:**

1. Sistema muestra un aviso para vincular la wallet (UC-003).
2. Use case continues at step 4.

## Postconditions

### Success Postconditions

- El donante ve sus donaciones, montos y causas apoyadas
- El receptor ve sus causas con estado, monto recaudado y fondos disponibles para retirar

### Failure Postconditions

- _None — la consulta es de solo lectura._

## Business Rules

### BR-001: Contenido por rol

El donante solo ve datos de sus donaciones; el receptor solo ve datos de sus causas.

### BR-002: Datos privados

Un usuario no puede ver el dashboard de otro usuario.

### BR-003: Donaciones confirmadas

Las donaciones y montos del dashboard provienen solo de donaciones confirmadas por el contrato (UC-014).
