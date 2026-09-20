# Use Case: Link Wallet

## Overview

**Use Case ID:** UC-003  
**Use Case Name:** Link Wallet  
**Primary Actor:** Donante  
**Secondary Actors:** Receptor  
**Goal:** Asociar una wallet a la cuenta demostrando que el usuario la controla  
**Status:** Implemented

**Requirements:** [FR-003](../requirements.md)

## Preconditions

- El usuario tiene sesión activa
- El usuario tiene una wallet compatible con HSK Chain testnet

## Main Success Scenario

1. Usuario elige conectar su wallet.
2. Sistema solicita a la wallet conectarse a HSK Chain testnet.
3. Usuario autoriza la conexión.
4. Sistema presenta un mensaje único para firmar.
5. Usuario firma el mensaje con su wallet.
6. Sistema verifica que la firma corresponde a la dirección de la wallet.
7. Sistema asocia la dirección a la cuenta del usuario.
8. Sistema confirma la vinculación.

## Alternative Flows

### A1: Firma inválida

**Trigger:** La firma no corresponde a la dirección declarada (step 6)  
**Flow:**

1. Sistema rechaza la vinculación e informa el error.
2. Use case ends.

### A2: Wallet ya vinculada a otra cuenta

**Trigger:** La dirección pertenece a otro usuario (step 7)  
**Flow:**

1. Sistema informa que la wallet ya está en uso.
2. Use case ends.

### A3: Usuario rechaza la firma

**Trigger:** El usuario cancela la solicitud en su wallet (step 5)  
**Flow:**

1. Sistema mantiene la cuenta sin wallet.
2. Use case ends.

### A4: Red incorrecta

**Trigger:** La wallet está en otra red (step 3)  
**Flow:**

1. Sistema solicita cambiar a HSK Chain testnet.
2. Use case continues at step 2.

## Postconditions

### Success Postconditions

- La cuenta tiene una dirección de wallet verificada

### Failure Postconditions

- La cuenta no cambia

## Business Rules

### BR-001: Prueba de propiedad

Una wallet solo se vincula si la firma del mensaje único se verifica contra la dirección declarada.

### BR-002: Una wallet por cuenta

Cada dirección se asocia como máximo a una cuenta, y cada cuenta tiene como máximo una wallet.

### BR-003: Mensaje de un solo uso

El mensaje a firmar es único por intento y no puede reutilizarse.
