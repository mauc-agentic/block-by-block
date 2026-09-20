# Requirements Catalog: Block by Block

Derivado de [vision.md](vision.md).

## Functional Requirements

| ID     | Title                      | User Story                                                                                                                                      | Priority | Status       |
|--------|----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|----------|--------------|
| FR-001 | Registro de cuenta         | As a visitante, I want registrarme como donante o receptor so that puedo usar la plataforma según mi rol.                                       | High     | Implemented  |
| FR-002 | Inicio de sesión           | As a usuario registrado, I want iniciar sesión so that accedo a mi dashboard y acciones.                                                        | High     | Implemented  |
| FR-003 | Vincular wallet            | As a usuario, I want vincular mi wallet demostrando que la controlo so that puedo donar o recibir fondos con mi dirección.                      | High     | In Progress  |
| FR-004 | Crear causa                | As a receptor, I want describir mi necesidad con título, descripción y monto objetivo so that los donantes puedan conocerla.                    | High     | Implemented  |
| FR-005 | Subir evidencia            | As a receptor, I want subir una foto de mi necesidad so that el agente pueda verificarla.                                                       | High     | Implemented  |
| FR-006 | Verificación por IA        | As a receptor, I want que mi causa sea evaluada automáticamente por IA so that pueda recibir donaciones sin esperar a un revisor humano.        | High     | In Progress  |
| FR-007 | Registro on-chain          | As a donante, I want que el resultado de la verificación quede registrado on-chain so that pueda confiar en que la causa fue validada.          | High     | In Progress  |
| FR-008 | Explorar causas            | As a donante, I want listar solo causas verificadas so that no dono a solicitudes sin validar.                                                  | High     | Implemented  |
| FR-009 | Detalle de causa           | As a donante, I want ver el detalle, avance y donaciones de una causa so that decido cuánto donar con transparencia.                            | Medium   | Implemented  |
| FR-010 | Donar                      | As a donante, I want donar stablecoins a una causa verificada so that el dinero llegue directo al receptor sin intermediarios.                  | High     | Implemented  |
| FR-011 | Retirar fondos             | As a receptor, I want retirar los fondos recaudados por mi causa verificada so that pueda usarlos para mi necesidad.                            | High     | Implemented  |
| FR-012 | Dashboard de donante       | As a donante, I want ver mis donaciones y las causas disponibles so that llevo control de mi aporte.                                            | Medium   | Implemented  |
| FR-013 | Dashboard de receptor      | As a receptor, I want ver mis causas, su estado y fondos disponibles so that sé cuándo puedo retirar.                                           | Medium   | Implemented  |
| FR-014 | Revisión humana            | As a receptor, I want que un revisor humano valide mi causa so that se reduzca el riesgo de fraude.                                             | Low      | Deferred |
| FR-015 | Reporte de fraude          | As a donante, I want reportar una causa sospechosa so that la comunidad se proteja del fraude.                                                  | Low      | Deferred |
| FR-016 | Reputación on-chain        | As a donante, I want ver el historial on-chain de un receptor so that evalúo su confiabilidad.                                                  | Low      | Deferred |
| FR-017 | Rampa de pesos             | As a donante, I want convertir pesos colombianos a stablecoin (Bre-B) so that pueda donar sin conocimientos cripto.                             | Low      | Deferred |

## Non-Functional Requirements

| ID      | Title                        | Requirement                                                                                                           | Category        | Priority | Status       |
|---------|------------------------------|-----------------------------------------------------------------------------------------------------------------------|-----------------|----------|--------------|
| NFR-001 | Cobertura de pruebas         | La cobertura de líneas combinada de contrato y backend debe ser de al menos 85 %.                                     | Maintainability | High     | In Progress  |
| NFR-002 | Latencia de listado          | `GET /causes` debe responder en menos de 2 s con hasta 500 causas.                                                    | Performance     | Medium   | Implemented  |
| NFR-003 | Tiempo de verificación       | El agente debe completar la verificación y publicar la tx en menos de 60 s (p95), sin contar la confirmación de bloque. | Performance     | High     | In Progress  |
| NFR-004 | Reintentos de OpenRouter     | Las llamadas a OpenRouter deben reintentarse hasta 3 veces con backoff exponencial y timeout de 30 s por intento.     | Reliability     | Medium   | Implemented  |
| NFR-005 | Comisión cero                | El contrato debe transferir el 100 % de lo donado al receptor; cualquier comisión de plataforma debe ser 0 %.         | Business        | High     | Implemented  |
| NFR-006 | Protección de contraseñas    | Las contraseñas deben almacenarse con bcrypt y nunca devolverse en respuestas de la API.                              | Security        | High     | Implemented  |
| NFR-007 | Expiración de sesión         | Los tokens de sesión deben expirar a las 24 h como máximo.                                                            | Security        | Medium   | Implemented  |
| NFR-008 | Secretos fuera del repo      | Ninguna llave privada, API key ni secreto debe estar versionado; solo se leen de variables de entorno.                | Security        | High     | Implemented  |
| NFR-009 | Protección de reentrada      | Toda función del contrato que transfiere tokens debe usar `nonReentrant` y `SafeERC20`.                               | Security        | High     | Implemented  |
| NFR-010 | Diseño responsivo            | El frontend debe ser utilizable en pantallas desde 360 px de ancho.                                                   | Usability       | Medium   | Deferred     |
| NFR-011 | Auditabilidad                | Cada donación y retiro debe emitir un evento on-chain consultable con causa, dirección y monto.                       | Auditability    | High     | Implemented  |

## Constraints

| ID    | Title                | Constraint                                                                              | Category  | Priority | Status       |
|-------|----------------------|-----------------------------------------------------------------------------------------|-----------|----------|--------------|
| C-001 | Lenguaje del contrato | El contrato debe escribirse en Solidity ^0.8.24, probado con Foundry.                  | Technical | High     | Implemented  |
| C-002 | Red                  | El despliegue debe hacerse en HSK Chain testnet (chain id 133, RPC: https://testnet.hsk.xyz). | Technical | High     | Implemented  |
| C-003 | Token                | Las donaciones deben usar una stablecoin ERC-20 de 6 decimales (USDT).                  | Technical | High     | Implemented  |
| C-004 | Backend              | El backend debe usar Python con FastAPI y SQLAlchemy.                                   | Technical | High     | Implemented  |
| C-005 | Proveedor de IA      | La verificación debe usar modelos con visión a través de OpenRouter (DeepSeek v4.1 Flash). | Technical | High     | Implemented  |
| C-006 | Frontend             | El frontend debe usar Next.js sobre Scaffold-ETH.                                       | Technical | High     | Deferred     |
| C-007 | Plazo                | El MVP debe estar entregado al cierre del hackathon (20 de septiembre de 2026).         | Schedule  | High     | In Progress  |
| C-008 | Repositorio público  | El código debe estar en un repositorio público de GitHub con README y documentación.    | Business  | High     | Implemented  |
| C-009 | Sin custodia         | El backend no debe custodiar fondos ni firmar transacciones de donantes o receptores.   | Business  | High     | Implemented  |
