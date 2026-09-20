# Use Case: Log In

## Overview

**Use Case ID:** UC-002  
**Use Case Name:** Log In  
**Primary Actor:** Donante  
**Secondary Actors:** Receptor  
**Goal:** Iniciar sesión para acceder a las funciones de la plataforma  
**Status:** Implemented

**Requirements:** [FR-002, NFR-006, NFR-007](../requirements.md)

## Preconditions

- El usuario tiene una cuenta registrada

## Main Success Scenario

1. Usuario abre la página de inicio de sesión.
2. Usuario ingresa correo y contraseña.
3. Sistema valida las credenciales.
4. Sistema abre una sesión de 24 horas.
5. Sistema dirige al usuario a su dashboard según su rol.

## Alternative Flows

### A1: Credenciales inválidas

**Trigger:** Correo inexistente o contraseña incorrecta (step 3)  
**Flow:**

1. Sistema informa "Credenciales inválidas" sin indicar cuál dato falló.
2. Use case continues at step 2.

### A2: Sesión expirada

**Trigger:** El usuario intenta una acción protegida con la sesión vencida (step 5)  
**Flow:**

1. Sistema cierra la sesión y solicita iniciar sesión de nuevo.
2. Use case continues at step 2.

## Postconditions

### Success Postconditions

- Existe una sesión activa asociada al usuario
- El usuario ve el dashboard correspondiente a su rol

### Failure Postconditions

- No se abre ninguna sesión

## Business Rules

### BR-001: Mensaje genérico

El sistema no revela si el correo existe cuando las credenciales fallan.

### BR-002: Duración de sesión

Una sesión dura como máximo 24 horas.
