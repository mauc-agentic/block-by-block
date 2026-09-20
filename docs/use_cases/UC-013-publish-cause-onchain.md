# Use Case: Publish Cause On-Chain

## Overview

**Use Case ID:** UC-013  
**Use Case Name:** Publish Cause On-Chain  
**Primary Actor:** Receptor  
**Secondary Actors:** Agente Verificador  
**Goal:** Registrar la causa en el contrato y enlazar su identificador con el registro de la plataforma  
**Status:** Approved

**Requirements:** [FR-004, FR-019, C-009, FR-024](../requirements.md)

## Preconditions

- El receptor tiene sesión activa y wallet vinculada (UC-003)
- Existe una causa Pending creada en la plataforma (UC-004)

## Main Success Scenario

1. Receptor solicita publicar su causa en el contrato.
2. Sistema entrega al receptor la instrucción de firma con título y monto objetivo.
3. Receptor firma y envía la transacción desde su wallet.
4. Contrato registra la causa y devuelve su identificador on-chain.
5. Sistema asocia el identificador on-chain con la causa de la plataforma.
6. Sistema habilita la verificación de la causa (UC-006) si ya tiene evidencia; si aún no la tiene, la habilita al recibirla (UC-005).

## Alternative Flows

### A1: Firma rechazada

**Trigger:** El receptor rechaza la firma en su wallet (step 3)  
**Flow:**

1. Sistema conserva la causa como Pending sin identificador on-chain.
2. Use case ends.

### A2: Causa ya publicada

**Trigger:** La causa ya tiene un identificador on-chain (step 1)  
**Flow:**

1. Sistema informa que la causa ya fue publicada y muestra su identificador.
2. Use case ends.

### A3: Transacción no confirmada

**Trigger:** La transacción no se confirma o el sistema no encuentra el evento de creación (step 4)  
**Flow:**

1. Sistema conserva la causa sin identificador on-chain y permite reintentar.
2. Use case ends.

### A4: Receptor ajeno a la causa

**Trigger:** Quien solicita no es el receptor dueño de la causa (step 1)  
**Flow:**

1. Sistema rechaza la solicitud.
2. Use case ends.

### A5: Transacción de otra wallet

**Trigger:** La transacción confirmada no fue enviada desde la wallet vinculada del receptor o no corresponde al título y monto de la causa (step 4)  
**Flow:**

1. Sistema rechaza el enlace y conserva la causa sin identificador on-chain.
2. Use case ends.

### A6: Receptor sin wallet

**Trigger:** El receptor no tiene wallet vinculada (step 1)  
**Flow:**

1. Sistema solicita vincular la wallet (UC-003).
2. Use case ends.

## Postconditions

### Success Postconditions

- La causa de la plataforma tiene su identificador on-chain único
- El contrato emite el evento de causa creada con el receptor como titular

### Failure Postconditions

- La causa permanece Pending sin identificador on-chain y no puede verificarse

## Business Rules

### BR-001: Sin custodia del backend

El backend solo entrega la instrucción de firma; la transacción la firma el receptor con su wallet.

### BR-002: Identificador único

Cada causa de la plataforma se enlaza con un solo identificador on-chain y viceversa.

### BR-003: Titularidad

El receptor titular en el contrato es la wallet vinculada del dueño de la causa.

### BR-004: Sin publicación no hay verificación

El agente solo evalúa causas que ya tienen identificador on-chain.
