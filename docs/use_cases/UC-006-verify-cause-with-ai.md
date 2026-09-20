# Use Case: Verify Cause With AI

## Overview

**Use Case ID:** UC-006  
**Use Case Name:** Verify Cause With AI  
**Primary Actor:** Agente Verificador  
**Secondary Actors:** Receptor  
**Goal:** Evaluar foto y descripción de una causa y registrar el resultado on-chain  
**Status:** Draft

**Requirements:** [FR-006, FR-007, NFR-003, NFR-004, NFR-008](../requirements.md)

## Preconditions

- Existe una causa en estado Pending con imagen y descripción
- El agente tiene acceso al modelo de visión y es la dirección autorizada en el contrato

## Main Success Scenario

1. Agente toma la verificación encolada de una causa.
2. Agente obtiene la imagen y la descripción de la causa.
3. Agente consulta al modelo de visión si hay evidencia real, si la imagen corresponde a la descripción y si la solicitud parece legítima.
4. Agente recibe un veredicto con nivel de confianza y motivo.
5. Agente almacena el resultado de la evaluación.
6. Agente registra el veredicto en el contrato para la causa.
7. Sistema marca la causa como Verified y la publica en el listado.

## Alternative Flows

### A1: Causa rechazada

**Trigger:** El veredicto es negativo o la confianza es menor al umbral mínimo (step 4)  
**Flow:**

1. Agente registra en el contrato la causa como rechazada.
2. Sistema marca la causa como Rejected y conserva el motivo.
3. Use case ends.

### A2: Modelo no disponible

**Trigger:** El proveedor de IA no responde a tiempo (step 3)  
**Flow:**

1. Agente reintenta hasta 3 veces con espera creciente.
2. Use case continues at step 3.

### A3: Reintentos agotados

**Trigger:** Los 3 reintentos fallan (step 3)  
**Flow:**

1. Sistema deja la causa en Pending y registra el fallo.
2. Use case ends.

### A4: Respuesta ilegible

**Trigger:** El modelo devuelve una respuesta que no es un veredicto válido (step 4)  
**Flow:**

1. Agente trata la respuesta como fallo y reintenta.
2. Use case continues at step 3.

### A5: Fallo al registrar on-chain

**Trigger:** La transacción de verificación falla o se agota el tiempo de red (step 6)  
**Flow:**

1. Agente reintenta con el RPC de respaldo.
2. Use case continues at step 6.

## Postconditions

### Success Postconditions

- La causa queda Verified o Rejected, tanto en la plataforma como en el contrato
- El resultado con su confianza y motivo queda guardado
- El contrato emite el evento de causa verificada

### Failure Postconditions

- La causa permanece en Pending y no admite donaciones

## Business Rules

### BR-001: Solo el agente

Únicamente la dirección del agente configurada en el contrato puede registrar veredictos.

### BR-002: Umbral de confianza

Una causa se verifica solo si el veredicto es positivo y la confianza es de al menos 0.80.

### BR-003: Llave del agente

La llave privada del agente solo se lee de variables de entorno y nunca se registra en logs ni en el repositorio.

### BR-004: Veredicto auditable

La huella del análisis se almacena on-chain junto al veredicto para su auditoría pública.
