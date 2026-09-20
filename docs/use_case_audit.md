# Use Case Audit: qué está pendiente de cada caso de uso

Auditoría del 2026-09-20 de los 14 casos de uso contra el código (contrato, backend, frontend), las pruebas y los flujos que ya corrimos con usuarios reales.
Objetivo: con más contexto de la web y de todos los flujos, saber **qué falta implementar, qué falta probar, qué la especificación dice distinto de la realidad y qué
comportamiento existe sin estar especificado**. Complementa [traceability.md](traceability.md) (estado por capa) e [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) (brechas).

**Método.** (1) Medición automática: `cd backend && python -m scripts.uc_coverage` cuenta cuántos flujos alternativos (A*) y reglas de negocio (BR-*) de cada UC tienen una prueba
cuyo nombre lo cita (`test_uc009_br001_…`, `test_UC010_BR001_…` en Foundry, `it('UC-009 A2 …')` en el frontend). (2) Revisión manual de cada flujo y regla contra el código, la interfaz y lo ocurrido
en las pruebas reales. Una regla "sin prueba" puede estar implementada: la cobertura mide **trazabilidad**, no corrección.

## 1. Resumen

- **Cobertura de especificación: 44 % → 75 %** (82 de 108 flujos y reglas con prueba por trazabilidad; ver §2). Subió al poner los IDs en pruebas que ya existían, contar las de Foundry y agregar las que faltaban (auth, evidencia ajena, datos inválidos, reglas de firma). Lo que queda sin prueba es casi todo **de frontend** y de **UC-012**.
- **Especificación y código coinciden en lo esencial**, con **9 decisiones** (§4): 7 aplicadas por defecto el 2026-09-20 a la especificación y al código, y 2 que siguen abiertas (D4, D8) que la spec no resuelve o que el producto contradice.
- **Sin pruebas de frontend:** todo flujo de interfaz (A3 y A4 de UC-003, A1 y A3 de UC-004, A1..A3 de UC-009, etc.) está sin prueba automatizada (NFR-017).
- **Faltan 3 casos de uso** de comportamiento que ya existe o que necesitamos (§5): cerrar sesión, reconciliar donaciones y recuperar una donación pendiente.

## 2. Cobertura de especificación (generada)

Se regenera con `cd backend && python -m scripts.uc_coverage --write-doc`; una prueba falla si esta tabla se desactualiza.

<!-- BEGIN COVERAGE -->
| UC | Estado | Con prueba | Sin prueba (por convención de nombres) |
|----|--------|-----------|----------------------------------------|
| UC-001 | Implemented | 6/6 | — |
| UC-002 | Implemented | 6/7 | BR-003 |
| UC-003 | Implemented | 7/9 | A3, A4 |
| UC-004 | Implemented | 4/6 | A3, BR-004 |
| UC-005 | Implemented | 8/8 | — |
| UC-006 | Implemented | 17/18 | BR-010 |
| UC-007 | Approved | 2/3 | A1 |
| UC-008 | Approved | 1/6 | A1, A2, A3, BR-002, BR-003 |
| UC-009 | Approved | 6/11 | A2, A3, A6, A7, BR-002 |
| UC-010 | Approved | 8/10 | A4, A5 |
| UC-011 | Approved | 6/6 | — |
| UC-012 | Implemented | 6/6 | — |
| UC-013 | Implemented | 8/10 | A1, BR-003 |
| UC-014 | Approved | 9/10 | A5 |
| UC-015 | Reviewed | 0/3 | A1, BR-001, BR-002 |
| UC-016 | Reviewed | 4/6 | BR-002, BR-003 |
| **Total** | | **98/125 (78 %)** | |
<!-- END COVERAGE -->

Las reglas que el diseño garantiza y no admiten prueba directa se cubren con una prueba estática: `test_c009_signing_boundaries.py` prueba que solo el módulo del agente firma
transacciones (UC-009 BR-004, UC-013 BR-001, UC-014 BR-003, UC-010 BR-005) y que la llave del agente nunca se registra ni se devuelve (UC-006 BR-003).

## 3. Pendiente por caso de uso

Leyenda: **B** backend, **C** contrato inteligente, **F** frontend, **T** pruebas, **S** especificación.

| UC | Estado | Pendiente |
|----|--------|-----------|
| UC-001 Registrar cuenta | Implemented | **T:** pruebas de frontend (A1, A2, A3 en pantalla). Backend cubierto |
| UC-002 Iniciar sesión | Implemented | **T:** pruebas de frontend. **F:** confirmar que un 401 en cualquier pantalla limpia la sesión y redirige (A2) |
| UC-003 Vincular wallet | Implemented | **B:** BR-003 (mensaje de un solo uso, GAP-009). **T:** A3 y A4 en el frontend. **S:** decisión D1 sobre re-vincular |
| UC-004 Crear causa | Implemented | **F:** pasar al detalle al terminar (S5-1). **T:** A3 (firma rechazada) en frontend. **S:** los pasos 7–8 duplican UC-013 (D7) |
| UC-005 Subir evidencia | Implemented | Sin pendientes de backend. **T:** pruebas de frontend |
| UC-006 Verificar causa con IA | Implemented | **F:** mostrar estado y "Reintentar verificación" (S2). **S:** D8 sobre el rechazo definitivo |
| UC-007 Explorar causas | Approved | **F:** página `/causes` y corregir la landing (D2). **T:** A1, BR-001, BR-002 en frontend |
| UC-008 Ver detalle | Approved | **F:** toda la pantalla `/cause/[id]` (S2). **S:** D3 sobre visibilidad de causas no verificadas |
| UC-009 Donar | Approved | **F:** toda la pantalla (S3). **C:** GAP-022 (el contrato acepta donar sobre la meta, D4). **S:** faltan A "cuenta activa distinta" y "red incorrecta" |
| UC-010 Retirar fondos | Approved | **F:** botón y flujo de firma (S4). **T:** BR-002, BR-003, BR-004 de Foundry sin ID en el nombre. **S:** falta A "cuenta activa distinta" |
| UC-011 Ver dashboard | Approved | **F:** secciones "Mis donaciones", retirar y reintentar (S4). **S:** el escenario principal aún dice "según el rol" en algún paso |
| UC-012 Administrar contrato | Implemented | Cerrado: contrato con 5 pruebas Foundry (`test_UC012_*`) y TC-004 automatizado; sin pantalla por decisión D5 |
| UC-013 Publicar on-chain | Implemented | **T:** A1 (firma rechazada) en frontend |
| UC-014 Registrar donación | Approved | **F:** confirmación con reintentos y recuperación (S3, FR-025). **S:** falta A "pestaña cerrada tras firmar". **T:** BR-003 por diseño (prueba estática) |

## 4. Decisiones (aplicadas por defecto el 2026-09-20; se pueden vetar)

Se tomó la propuesta de cada fila como valor por defecto y se reflejó en los UC **antes** que en el código. Cualquiera puede revertirse editando el UC indicado.

| # | Tema | Decisión | Dónde quedó | Estado |
|---|------|----------|-------------|--------|
| D1 | Re-vincular wallet (UC-003 BR-002) | Con causas publicadas la wallet no cambia; sin ellas sí | UC-003 A5 y BR-004; `POST /auth/wallet/link` (GAP-040) | Aplicada |
| D2 | Causas de muestra en la landing (UC-007 A1) | Solo el mensaje de vacío; nunca causas de ejemplo | UC-007 A1; **falta el cambio en el frontend** (GAP-041) | Spec aplicada, front pendiente |
| D3 | Visibilidad de causas no verificadas (UC-008) | El detalle es público en cualquier estado; la foto se oculta en revisión | UC-008 BR-003 | Aplicada |
| D4 | Contrato acepta donar sobre la meta (UC-009 A4) | Limitación del MVP; se corrige en la siguiente versión del contrato (requiere redesplegar) | GAP-022 | **Abierta** |
| D5 | UC-012 sin pantalla | Aceptado para el MVP; cubierto con pruebas del contrato | 5 pruebas Foundry `test_UC012_*`; TC-004 automatizado | Aplicada |
| D6 | Rechazo definitivo | Se mantiene; la interfaz explica el motivo y ofrece crear otra causa | UC-006 BR-010 | Aplicada |
| D7 | UC-004 pasos 7–8 | Reemplazados por "dirigir a publicar (UC-013)" y a la evidencia | UC-004 | Aplicada |
| D8 | Estabilidad del veredicto de la IA | Umbral 0.80; ensayar cada foto 3 veces | GAP-038 | **Abierta** (vigilar) |
| D9 | Pausa del contrato y retiros (nueva) | La pausa bloquea causas nuevas y donaciones, **no los retiros**: nadie queda sin acceso a sus fondos; el contrato ya lo hacía, la spec decía lo contrario | UC-012 BR-002 y paso 3; TC-004 | Aplicada |

## 5. Casos de uso que faltan o deben ampliarse

| Propuesta | Por qué | Contenido |
|-----------|---------|-----------|
| **UC-015 Cerrar sesión** (nuevo) | La interfaz ya lo ofrece ("Cerrar sesión" en el header y el dashboard) sin especificación | Usuario cierra sesión; el sistema elimina la sesión local; A1: sesión ya expirada |
| **UC-016 Reconciliar donaciones** (nuevo, sistema) | Si el cliente no confirma, la donación queda en la cadena y no en la plataforma (GAP-034) | El sistema lee periódicamente los eventos de donación y registra las que falten; BR: idempotente por hash |
| **UC-014 A5 "Pestaña cerrada tras firmar"** (ampliar) | Es FR-025: recuperar una donación ya firmada | El sistema conserva el hash en el navegador y reintenta el registro al volver |
| **UC-009 A6/A7 y UC-010 A5** (ampliar) | Casos vistos al escribir la spec de frontend | Cuenta activa en la wallet distinta de la vinculada; red equivocada |
| **UC-011** (ajustar) | Ya muestra causas, donaciones, retiro y reintento | Reflejarlo en el escenario principal y quitar "según el rol" |
| **UC-007 A1** (aclarar) | Ver D2 | Sin causas verificadas se muestra solo el mensaje |

## 6. Plan para cerrarlo

| Orden | Trabajo | Quién |
|-------|---------|-------|
| 1 | Decidir D1..D8 (15 minutos) y reflejar las respuestas en los UC | Equipo |
| 2 | Aplicar los ajustes de especificación de §5 (los UC se editan **antes** que el código, regla AIUP) | Miguel |
| 3 | Pruebas de backend que faltan y renombres de trazabilidad restantes | Miguel |
| 4 | Pantallas S1..S5 de [frontend_spec.md](frontend_spec.md), con `describe('UC-###')` por criterio | Carlos Andres |
| 5 | Pruebas Foundry de UC-012 y corrección de las 2 que fallan (GAP-006, GAP-030) | Miguel |
| 6 | Ejecutar TC-005 en vivo y pasar los UC completos a `Done` | Ambos |
