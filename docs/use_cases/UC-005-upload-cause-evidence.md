# Use Case: Upload Cause Evidence

## Overview

**Use Case ID:** UC-005  
**Use Case Name:** Upload Cause Evidence  
**Primary Actor:** Receptor  
**Goal:** Adjuntar una foto que respalde la necesidad y disparar su verificación  
**Status:** Implemented

**Requirements:** [FR-005, FR-006, FR-021](../requirements.md)

## Preconditions

- El receptor tiene sesión activa
- Existe una causa del receptor en estado Pending sin evidencia

## Main Success Scenario

1. Receptor abre su causa en estado Pending.
2. Receptor selecciona una foto de la necesidad.
3. Sistema valida el formato y el tamaño de la imagen.
4. Sistema almacena la imagen y guarda su huella de contenido en la causa.
5. Sistema encola la verificación de la causa (UC-006).
6. Sistema informa que la causa está en revisión.

## Alternative Flows

### A1: Imagen inválida

**Trigger:** Formato no soportado o tamaño superior al máximo (step 3)  
**Flow:**

1. Sistema rechaza la imagen e indica los formatos y el tamaño permitidos.
2. Use case continues at step 2.

### A2: Causa ajena

**Trigger:** La causa pertenece a otro usuario (step 1)  
**Flow:**

1. Sistema niega el acceso.
2. Use case ends.

### A3: Reemplazo de evidencia

**Trigger:** La causa ya tenía una imagen y sigue en Pending (step 2)  
**Flow:**

1. Sistema reemplaza la imagen anterior.
2. Use case continues at step 3.

## Postconditions

### Success Postconditions

- La causa tiene imagen asociada
- Existe una verificación encolada para la causa

### Failure Postconditions

- La causa conserva su imagen anterior, si tenía una
- No se encola ninguna verificación

## Business Rules

### BR-001: Solo el dueño

Solo el receptor que creó la causa puede subir su evidencia.

### BR-002: Formatos permitidos

Solo se aceptan imágenes JPEG o PNG de hasta 5 MB.

### BR-003: Sin cambios tras verificar

Una causa que ya fue verificada o rechazada no admite reemplazo de evidencia.

### BR-004: Tamaño máximo

La imagen no puede superar 5 MB; una imagen mayor se rechaza.

### BR-005: Evidencia conservada

La imagen subida se conserva de forma consultable y su huella queda asociada a la causa, de modo que el agente y cualquier auditor evalúen la misma imagen.
