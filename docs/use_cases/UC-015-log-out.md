# Use Case: Log Out

## Overview

**Use Case ID:** UC-015  
**Use Case Name:** Log Out  
**Primary Actor:** Usuario  
**Secondary Actors:** —  
**Goal:** Terminar la sesión activa en el dispositivo actual  
**Status:** Reviewed

**Requirements:** [FR-026, NFR-007](../requirements.md)

## Preconditions

- El usuario tiene sesión activa

## Main Success Scenario

1. Usuario elige cerrar sesión.
2. Sistema elimina la sesión del dispositivo.
3. Sistema lleva al usuario a una pantalla pública.
4. Sistema deja de mostrar datos personales y acciones que requieren sesión.

## Alternative Flows

### A1: Sesión ya expirada

**Trigger:** La sesión ya había expirado al cerrar sesión (step 2)  
**Flow:**

1. Sistema elimina igualmente los restos de la sesión.
2. Use case continues at step 3.

## Postconditions

### Success Postconditions

- El dispositivo queda sin sesión y sin datos personales en pantalla
- La wallet vinculada y las causas del usuario no cambian

### Failure Postconditions

- _None — cerrar sesión no puede fallar._

## Business Rules

### BR-001: Sesión solo local

Cerrar sesión afecta solo al dispositivo actual; no cancela la cuenta ni desvincula la wallet.

### BR-002: Sin datos residuales

Tras cerrar sesión no queda en el dispositivo ninguna credencial de acceso.
