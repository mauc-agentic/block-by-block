# Use Case: Register Account

## Overview

**Use Case ID:** UC-001  
**Use Case Name:** Register Account  
**Primary Actor:** Visitante  
**Goal:** Crear una cuenta como donante o receptor  
**Status:** Draft

**Requirements:** [FR-001, NFR-006, NFR-007](../requirements.md)

## Preconditions

- El visitante no tiene una sesión activa

## Main Success Scenario

1. Visitante abre la página de registro.
2. Sistema muestra el formulario con nombre de usuario, correo, contraseña y rol (donante o receptor).
3. Visitante completa los datos y elige su rol.
4. Visitante envía el formulario.
5. Sistema valida los datos y verifica que el correo y el nombre de usuario no existan.
6. Sistema crea la cuenta y abre una sesión de 24 horas.
7. Sistema dirige al visitante a la vinculación de wallet.

## Alternative Flows

### A1: Usuario ya existe

**Trigger:** El correo o el nombre de usuario ya están registrados (step 5)  
**Flow:**

1. Sistema informa que el usuario ya existe.
2. Visitante corrige los datos.
3. Use case continues at step 4.

### A2: Datos inválidos

**Trigger:** Correo con formato inválido, contraseña corta o rol no permitido (step 5)  
**Flow:**

1. Sistema indica los campos inválidos.
2. Visitante corrige los datos.
3. Use case continues at step 4.

## Postconditions

### Success Postconditions

- Existe un usuario con el rol elegido y sin wallet vinculada
- La contraseña queda almacenada de forma no reversible
- Existe una sesión activa para el nuevo usuario

### Failure Postconditions

- No se crea ninguna cuenta
- No se abre ninguna sesión

## Business Rules

### BR-001: Rol único

Cada cuenta tiene exactamente un rol: donante o receptor. El rol no cambia después del registro.

### BR-002: Unicidad

El correo y el nombre de usuario deben ser únicos en la plataforma.

### BR-003: Contraseña mínima

La contraseña debe tener al menos 8 caracteres y nunca se devuelve en respuestas.
