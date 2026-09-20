# Use Case: Register Account

## Overview

**Use Case ID:** UC-001  
**Use Case Name:** Register Account  
**Primary Actor:** Visitante  
**Goal:** Crear una cuenta como donante o receptor  
**Status:** Reviewed

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

### A3: Registro con proveedor externo

**Trigger:** El visitante elige continuar con una cuenta externa (Google) en lugar de completar el formulario (step 2)  
**Flow:**

1. Sistema redirige al visitante al proveedor externo para que confirme su identidad y elija su rol (donante o receptor).
2. Visitante autoriza a Block by Block a verificar su identidad ante el proveedor externo.
3. Sistema recibe el correo verificado y la identidad confirmada por el proveedor externo.
4. Sistema deriva un nombre de usuario a partir del perfil externo.
5. Use case continues at step 5.

## Postconditions

### Success Postconditions

- Existe un usuario con el rol elegido y sin wallet vinculada
- Para cuentas registradas con correo y contraseña, la contraseña queda almacenada de forma no reversible
- Para cuentas registradas con un proveedor externo, la cuenta queda asociada a esa identidad externa
- Existe una sesión activa para el nuevo usuario

### Failure Postconditions

- No se crea ninguna cuenta
- No se abre ninguna sesión

## Business Rules

### BR-001: Rol único

Cada cuenta tiene exactamente un rol: donante o receptor. El rol no cambia después del registro.

### BR-002: Unicidad

El correo, el nombre de usuario y la identidad confirmada por un proveedor externo deben ser únicos en la plataforma.

### BR-003: Contraseña mínima

Para cuentas registradas con correo y contraseña, la contraseña debe tener al menos 8 caracteres y nunca se devuelve en respuestas. Las cuentas registradas mediante un proveedor externo no tienen contraseña propia de la plataforma.

### BR-004: Nombre de usuario derivado único

Si el nombre de usuario derivado del perfil externo ya existe, el sistema genera una variante única antes de crear la cuenta.
