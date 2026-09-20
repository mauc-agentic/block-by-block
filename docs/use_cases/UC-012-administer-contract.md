# Use Case: Administer Contract

## Overview

**Use Case ID:** UC-012  
**Use Case Name:** Administer Contract  
**Primary Actor:** Administrador  
**Secondary Actors:** Agente Verificador  
**Goal:** Pausar o reanudar la plataforma en el contrato y rotar la dirección autorizada del agente  
**Status:** Implemented

**Requirements:** [FR-018, NFR-008, NFR-009](../requirements.md)

## Preconditions

- El contrato está desplegado y el administrador es su propietario
- El administrador controla la wallet propietaria

## Main Success Scenario

1. Administrador decide intervenir el contrato (incidente, mantenimiento o llave del agente comprometida).
2. Administrador solicita al contrato pausar la plataforma.
3. Contrato queda en pausa y bloquea la creación de causas y las donaciones; los retiros siguen permitidos.
4. Administrador corrige la situación.
5. Administrador solicita al contrato reanudar la plataforma.
6. Contrato vuelve a aceptar operaciones.

## Alternative Flows

### A1: Rotar el agente

**Trigger:** La llave del agente está comprometida o cambia el servicio verificador (step 1)  
**Flow:**

1. Administrador indica la nueva dirección del agente.
2. Contrato reemplaza al agente autorizado.
3. Use case ends.

### A2: Solicitante sin autoridad

**Trigger:** Una cuenta distinta del propietario intenta pausar, reanudar o rotar el agente (step 2)  
**Flow:**

1. Contrato rechaza la operación.
2. Use case ends.

### A3: Dirección de agente inválida

**Trigger:** La nueva dirección del agente es la dirección cero (step 1)  
**Flow:**

1. Contrato rechaza la operación y conserva el agente actual.
2. Use case ends.

## Postconditions

### Success Postconditions

- El contrato está en el estado de pausa solicitado o con el nuevo agente autorizado
- El cambio queda registrado como transacción pública

### Failure Postconditions

- El estado del contrato no cambia

## Business Rules

### BR-001: Solo el propietario

Únicamente la dirección propietaria del contrato puede pausar, reanudar o rotar el agente.

### BR-002: Pausa efectiva

Mientras el contrato está en pausa no se aceptan nuevas causas ni donaciones. Los retiros siguen permitidos para que ningún receptor quede sin acceso a sus fondos durante un incidente.

### BR-003: Agente válido

El agente autorizado nunca puede ser la dirección cero.
