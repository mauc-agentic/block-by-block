# Use Case: Log In

## Overview

**Use Case ID:** UC-002  
**Use Case Name:** Log In  
**Primary Actor:** Usuario  
**Secondary Actors:** —  
**Goal:** Iniciar sesión para acceder a las funciones de la plataforma  
**Status:** Implemented

**Requirements:** [FR-002, NFR-006, NFR-007, FR-023](../requirements.md)

## Preconditions

- El usuario tiene una cuenta registrada

## Main Success Scenario

1. Usuario abre la página de inicio de sesión.
2. Usuario ingresa correo y contraseña.
3. Sistema valida las credenciales.
4. Sistema abre una sesión de 24 horas.
5. Sistema dirige al usuario a su dashboard.

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

### A3: Inicio de sesión con proveedor externo

**Trigger:** El usuario elige continuar con una cuenta externa (Google) en lugar de ingresar correo y
contraseña (step 2)  
**Flow:**

1. Sistema redirige al usuario al proveedor externo para que confirme su identidad.
2. Usuario autoriza a Block by Block a verificar su identidad ante el proveedor externo.
3. Sistema recibe la identidad confirmada por el proveedor externo.
4. Sistema busca una cuenta cuya identidad externa coincida con la recibida.
5. Use case continues at step 4.

### A4: Identidad externa no registrada

**Trigger:** Ninguna cuenta está asociada a la identidad confirmada por el proveedor externo (step 4 de A3)  
**Flow:**

1. Sistema informa que no existe una cuenta para esa identidad y sugiere registrarse.
2. Use case ends in failure.

## Postconditions

### Success Postconditions

- Existe una sesión activa asociada al usuario
- El usuario ve su dashboard, con sus causas y sus donaciones

### Failure Postconditions

- No se abre ninguna sesión

## Business Rules

### BR-001: Mensaje genérico

El sistema no revela si el correo existe cuando las credenciales fallan.

### BR-002: Duración de sesión

Una sesión dura como máximo 24 horas.

### BR-003: Coincidencia de identidad externa

Para cuentas registradas con un proveedor externo, el sistema autentica únicamente comparando la
identidad confirmada por ese proveedor; no se usa correo ni contraseña.
