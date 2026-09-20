# Use Case: Withdraw Funds

## Overview

**Use Case ID:** UC-010  
**Use Case Name:** Withdraw Funds  
**Primary Actor:** Receptor  
**Goal:** Retirar a su wallet los fondos recaudados por una causa verificada  
**Status:** Implemented

**Requirements:** [FR-011, NFR-005, NFR-009, NFR-011](../requirements.md)

## Preconditions

- El receptor tiene sesión activa y su wallet vinculada (UC-003)
- La causa es del receptor y está verificada
- La causa tiene fondos recaudados sin retirar
- La wallet del receptor tiene saldo para el gas

## Main Success Scenario

1. Receptor abre su dashboard (UC-011).
2. Sistema muestra los fondos disponibles de cada causa.
3. Receptor elige retirar los fondos de una causa.
4. Sistema muestra el monto a retirar y la wallet de destino.
5. Receptor firma en su wallet el retiro.
6. Contrato transfiere todo el monto disponible a la wallet del receptor y emite el evento de retiro.
7. Sistema actualiza los fondos disponibles de la causa a cero.
8. Sistema confirma el retiro con enlace a la transacción.

## Alternative Flows

### A1: Sin fondos

**Trigger:** La causa no tiene fondos disponibles (step 3)  
**Flow:**

1. Sistema no habilita el retiro e informa que no hay fondos.
2. Use case ends.

### A2: Causa ajena

**Trigger:** La wallet firmante no es la del receptor de la causa (step 6)  
**Flow:**

1. Contrato rechaza el retiro.
2. Sistema informa que solo el receptor puede retirar.
3. Use case ends.

### A3: Causa no verificada

**Trigger:** La causa no está verificada (step 6)  
**Flow:**

1. Contrato rechaza el retiro.
2. Use case ends.

### A4: Transacción rechazada

**Trigger:** El receptor cancela o la transacción falla (step 5)  
**Flow:**

1. Sistema informa que el retiro no se realizó y los fondos siguen disponibles.
2. Use case ends.

## Postconditions

### Success Postconditions

- El receptor recibe en su wallet el monto recaudado
- Los fondos disponibles de la causa quedan en cero
- Se emite el evento público de retiro

### Failure Postconditions

- Los fondos permanecen en el contrato a favor de la causa

## Business Rules

### BR-001: Solo el receptor

Únicamente la wallet del receptor de la causa puede retirar sus fondos.

### BR-002: Solo causas verificadas

No se pueden retirar fondos de causas Pending o Rejected.

### BR-003: Retiro total

Cada retiro transfiere la totalidad de los fondos disponibles de la causa.

### BR-004: Sin reentrada

Los fondos disponibles se ponen en cero antes de transferir para evitar doble retiro.
