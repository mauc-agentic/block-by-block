# Use Case: Verify Cause With AI

## Overview

**Use Case ID:** UC-006  
**Use Case Name:** Verify Cause With AI  
**Primary Actor:** Agente Verificador  
**Secondary Actors:** Receptor  
**Goal:** Evaluar foto y descripción de una causa y registrar el resultado on-chain  
**Status:** Implemented

**Requirements:** [FR-006, FR-007, NFR-003, NFR-004, NFR-008, FR-019, FR-021, FR-022](../requirements.md)

## Preconditions

- Existe una causa en estado Pending con imagen y descripción, publicada en el contrato (UC-013)
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

1. Agente reintenta hasta 3 veces con espera creciente.
2. Si los reintentos se agotan, la causa permanece Pending y el fallo queda registrado.
3. Use case ends.

### A6: Reintento solicitado por el titular

**Trigger:** La causa lleva demasiado tiempo Pending y el titular solicita reintentar la verificación (step 1)  
**Flow:**

1. Sistema comprueba que la causa está Pending, publicada en el contrato y con evidencia.
2. Sistema encola la verificación y responde de inmediato.
3. Use case continues at step 2.

### A7: Reinicio del servicio

**Trigger:** El servicio se reinicia mientras había verificaciones en curso (step 1)  
**Flow:**

1. Al arrancar, sistema busca las causas Pending, publicadas y con evidencia.
2. Sistema encola su verificación.
3. Use case continues at step 2.

### A8: Verificación ya en curso

**Trigger:** Ya hay una verificación en curso para la misma causa (step 1)  
**Flow:**

1. Sistema no encola otra y lo informa.
2. Use case ends.

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

### BR-005: Estado sincronizado

Cuando el veredicto queda registrado en el contrato, la plataforma actualiza en el mismo flujo el estado de la causa (Verified o Rejected); nunca queda Verified en la plataforma sin veredicto on-chain, ni al revés.

### BR-006: Evaluación de la evidencia real

El agente evalúa la imagen efectivamente subida por el receptor; una imagen sustituta o ausente impide la verificación y deja la causa en Pending.

### BR-007: Una verificación a la vez

Para una misma causa solo puede haber una verificación en curso; solicitar otra mientras tanto no genera un segundo veredicto.

### BR-008: Reintento solo del titular

Solo el titular de la causa puede solicitar el reintento, y solo mientras la causa esté Pending.
