# Requirements Catalog: Block by Block

Derivado de [vision.md](vision.md). Estado auditado contra el código el 2026-09-20; actualizado tras el ciclo de verificación real (ver [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md)).

Vocabulario de estado FR: `Open → In Progress → Implemented → Verified`. `Deferred` = fuera del MVP.
"Implemented" significa código + al menos una prueba automatizada; "Verified" significa además probado en HSK testnet extremo a extremo.

## Functional Requirements

| ID     | Title                      | User Story                                                                                                                                      | Priority | Status       |
|--------|----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|----------|--------------|
| FR-001 | Registro de cuenta         | As a visitante, I want registrarme so that puedo donar a causas o publicar la mía, sin elegir un rol fijo.                                      | High     | Implemented  |
| FR-002 | Inicio de sesión           | As a usuario registrado, I want iniciar sesión so that accedo a mi dashboard y acciones.                                                        | High     | Implemented  |
| FR-003 | Vincular wallet            | As a usuario, I want vincular mi wallet demostrando que la controlo so that puedo donar o recibir fondos con mi dirección.                      | High     | Implemented  |
| FR-004 | Crear causa                | As a receptor, I want describir mi necesidad con título, descripción y monto objetivo so that los donantes puedan conocerla.                    | High     | Implemented  |
| FR-005 | Subir evidencia            | As a receptor, I want subir una foto de mi necesidad so that el agente pueda verificarla.                                                       | High     | Verified  |
| FR-006 | Verificación por IA        | As a receptor, I want que mi causa sea evaluada automáticamente por IA so that pueda recibir donaciones sin esperar a un revisor humano.        | High     | Verified  |
| FR-007 | Registro on-chain          | As a donante, I want que el resultado de la verificación quede registrado on-chain so that pueda confiar en que la causa fue validada.          | High     | Verified  |
| FR-008 | Explorar causas            | As a donante, I want listar solo causas verificadas so that no dono a solicitudes sin validar.                                                  | High     | Implemented  |
| FR-009 | Detalle de causa           | As a donante, I want ver el detalle, avance y donaciones de una causa so that decido cuánto donar con transparencia.                            | Medium   | Implemented  |
| FR-010 | Donar                      | As a donante, I want donar stablecoins a una causa verificada so that el dinero llegue directo al receptor sin intermediarios.                  | High     | Verified  |
| FR-011 | Retirar fondos             | As a receptor, I want retirar los fondos recaudados por mi causa verificada so that pueda usarlos para mi necesidad.                            | High     | Verified  |
| FR-012 | Dashboard de donante       | As a donante, I want ver mis donaciones y las causas disponibles so that llevo control de mi aporte.                                            | Medium   | Implemented         |
| FR-013 | Dashboard de receptor      | As a receptor, I want ver mis causas, su estado y fondos disponibles so that sé cuándo puedo retirar.                                           | Medium   | Implemented         |
| FR-014 | Revisión humana            | As a receptor, I want que un revisor humano valide mi causa so that se reduzca el riesgo de fraude.                                             | Low      | Deferred     |
| FR-015 | Reporte de fraude          | As a donante, I want reportar una causa sospechosa so that la comunidad se proteja del fraude.                                                  | Low      | Deferred     |
| FR-016 | Reputación on-chain        | As a donante, I want ver el historial on-chain de un receptor so that evalúo su confiabilidad.                                                  | Low      | Deferred     |
| FR-017 | Rampa de pesos             | As a donante, I want convertir pesos colombianos a stablecoin (Bre-B) so that pueda donar sin conocimientos cripto.                             | Low      | Deferred     |
| FR-018 | Administración del contrato | As a administrador de la plataforma, I want pausar y reanudar el contrato y rotar la dirección del agente so that puedo reaccionar ante un incidente o una llave comprometida. | Medium | Implemented |
| FR-019 | Publicar causa on-chain    | As a receptor, I want que mi causa quede registrada en el contrato y enlazada con su registro en la plataforma so that la verificación y las donaciones apunten a la misma causa. | High | Verified |
| FR-020 | Registrar donación         | As a donante, I want que mi donación confirmada quede reflejada en la plataforma so that aparezca en mi dashboard y en el avance de la causa. | High | Verified |
| FR-021 | Almacenar evidencia        | As a receptor, I want que mi foto se conserve de forma consultable so that el agente la evalúe con la imagen real y la evidencia sea auditable. | High | Verified |
| FR-022 | Sincronizar estado de causa | As a donante, I want que el estado de la causa en la plataforma refleje el veredicto registrado on-chain so that el listado solo muestre causas realmente verificadas. | High | Verified |
| FR-023 | Acceso con Google           | As a visitante, I want registrarme e iniciar sesión con mi cuenta de Google so that accedo sin crear otra contraseña. | Medium | Implemented |
| FR-024 | Wallet en el navegador      | As a usuario, I want conectar mi wallet en la interfaz y firmar la publicación, el `approve`, la donación y el retiro so that opero sin salir de la plataforma. | High | Open |

## Non-Functional Requirements

| ID      | Title                        | Requirement                                                                                                           | Category        | Priority | Status       |
|---------|------------------------------|-----------------------------------------------------------------------------------------------------------------------|-----------------|----------|--------------|
| NFR-001 | Cobertura de pruebas         | La cobertura de líneas combinada de contrato y backend debe ser de al menos 85 %. Medido 2026-09-20: contrato 88.5 %, backend 91 %. | Maintainability | High     | Implemented  |
| NFR-002 | Latencia de listado          | `GET /causes` debe responder en menos de 2 s con hasta 500 causas. Sin medición todavía.                              | Performance     | Medium   | In Progress  |
| NFR-003 | Tiempo de verificación       | El agente debe completar la verificación y publicar la tx en menos de 60 s (p95), sin contar la confirmación de bloque. Sin medición todavía. | Performance | High | In Progress  |
| NFR-004 | Reintentos de OpenRouter     | Las llamadas a OpenRouter deben reintentarse hasta 3 veces con backoff exponencial y timeout de 30 s por intento.     | Reliability     | Medium   | Implemented  |
| NFR-005 | Comisión cero                | El contrato debe transferir el 100 % de lo donado al receptor; cualquier comisión de plataforma debe ser 0 %.         | Business        | High     | Implemented  |
| NFR-006 | Protección de contraseñas    | Las contraseñas deben almacenarse con un hash adaptativo con sal (argon2id) y nunca devolverse en respuestas de la API. Ver Change Log (antes: bcrypt). | Security | High | Implemented  |
| NFR-007 | Expiración de sesión         | Los tokens de sesión deben expirar a las 24 h como máximo.                                                            | Security        | Medium   | Implemented  |
| NFR-008 | Secretos fuera del repo      | Ninguna llave privada, API key ni secreto debe estar versionado; solo se leen de variables de entorno. Incidente 2026-09-20: un `SECRET_KEY` quedó en el historial de `main`; pendiente rotarlo. | Security | High | In Progress  |
| NFR-009 | Protección de reentrada      | Toda función del contrato que transfiere tokens debe usar `nonReentrant` y `SafeERC20`.                               | Security        | High     | Implemented  |
| NFR-010 | Diseño responsivo            | El frontend debe ser utilizable en pantallas desde 360 px de ancho.                                                   | Usability       | Medium   | Deferred     |
| NFR-011 | Auditabilidad                | Cada donación y retiro debe emitir un evento on-chain consultable con causa, dirección y monto.                       | Auditability    | High     | Implemented  |
| NFR-012 | Observabilidad               | El backend debe emitir logs estructurados (JSON) y responder errores no controlados con un formato uniforme mediante un middleware global. | Maintainability | Medium | Open |
| NFR-013 | Migraciones versionadas      | Todo cambio del esquema de base de datos debe aplicarse mediante migraciones versionadas (Alembic), no con creación automática de tablas al iniciar. | Maintainability | Medium | Open |
| NFR-014 | Límite de tasa               | Los endpoints de autenticación y de subida de evidencia deben limitar peticiones por IP para mitigar abuso.          | Security        | Low      | Deferred     |
| NFR-015 | Disponibilidad del servicio  | El backend debe exponer un health check (`GET /api/v1/health`) y desplegarse en contenedor con reinicio automático.   | Reliability     | Medium   | In Progress  |
| NFR-016 | Coherencia frontend-backend  | El contrato de API es único (`docs/api_contract.md`), su bloque de endpoints y esquemas se genera desde el código y una prueba falla si se desalinea; el vocabulario sale de `docs/glossary.md`. | Maintainability | High | Implemented |
| NFR-017 | Pruebas de frontend          | Cada pantalla ligada a un UC debe tener al menos una prueba (`describe('UC-### …')`), y `npm run lint` y `npm run build` deben pasar. | Maintainability | Medium | Open |

## Constraints

| ID    | Title                 | Constraint                                                                              | Category  | Priority | Status       |
|-------|-----------------------|-----------------------------------------------------------------------------------------|-----------|----------|--------------|
| C-001 | Lenguaje del contrato | El contrato debe escribirse en Solidity ^0.8.24, probado con Foundry.                   | Technical | High     | Implemented  |
| C-002 | Red                   | El despliegue debe hacerse en HSK Chain testnet (chain id 133, RPC: https://testnet.hsk.xyz). | Technical | High | Implemented  |
| C-003 | Token                 | Las donaciones deben usar una stablecoin ERC-20 de 6 decimales (USDT). En testnet se usa `MockUSDT` (ver C-012). | Technical | High | Implemented  |
| C-004 | Backend               | El backend debe usar Python con FastAPI y SQLAlchemy.                                   | Technical | High     | Implemented  |
| C-005 | Proveedor de IA       | La verificación debe usar modelos con visión a través de OpenRouter (DeepSeek v4.1 Flash). | Technical | High   | Implemented  |
| C-006 | Frontend              | El frontend debe usar Next.js sobre Scaffold-ETH. Estado real: Next.js 16 sin Scaffold-ETH ni librería de wallet; tiene landing, FAQ, términos y autenticación (correo y Google); el listado usa datos de muestra. | Technical | High | Deferred     |
| C-007 | Plazo                 | El MVP debe estar entregado al cierre del hackathon (20 de septiembre de 2026).         | Schedule  | High     | In Progress  |
| C-008 | Repositorio público   | El código debe estar en un repositorio público de GitHub con README y documentación.    | Business  | High     | Implemented  |
| C-009 | Sin custodia          | El backend no debe custodiar fondos ni firmar transacciones de donantes o receptores.   | Business  | High     | Implemented  |
| C-010 | Base de datos         | La persistencia debe ser Supabase PostgreSQL, accedida mediante el session pooler (`aws-0-ca-central-1.pooler.supabase.com:5432`); la conexión directa `db.<ref>.supabase.co` no resuelve en todas las redes. | Technical | High | Implemented |
| C-011 | Despliegue backend    | El backend debe desplegarse en Render como contenedor Docker, con dependencias sin compilación Rust (`psycopg2-binary`, `argon2-cffi`). | Technical | Medium | In Progress |
| C-012 | Token de pruebas      | En HSK testnet se despliega `MockUSDT` (ERC-20, 6 decimales) como token de la bóveda; el token real se configura por constructor de `CauseVault` en mainnet. | Technical | Medium | Implemented |
| C-013 | Despliegue del frontend      | El frontend se despliega en Vercel con Root Directory `frontend`, Build Command `npm run build` y `NEXT_PUBLIC_API_URL` apuntando al backend; su origen debe estar en `ALLOWED_ORIGINS`. | Technical | Medium | Implemented |

## Change Log

| Fecha      | Cambio                                                                                                                                                       |
|------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 2026-09-20 | NFR-006: bcrypt → argon2id. Motivo: `passlib 1.7.4` es incompatible con `bcrypt 5.x` y bcrypt trunca a 72 bytes.                                             |
| 2026-09-20 | Estados de FR-004..FR-013 rebajados tras auditoría: el backend no actualiza `Cause.status`, no expone dashboard, no guarda la imagen y no registra donaciones. |
| 2026-09-20 | Nuevos: FR-018..FR-022, NFR-012..NFR-015, C-010..C-012 (derivados del código y despliegue existentes).                                                       |
| 2026-09-20 | FR-004..007, FR-019, FR-021, FR-022: Implemented/Verified tras prueba real (Supabase + HSK testnet + OpenRouter) con `scripts/e2e_verification.py`. |
| 2026-09-20 | FR-010, FR-011, FR-020: Verified con `scripts/e2e_donation.py` (donante con wallet propia: approve + donate, registro, dashboards y retiro en HSK testnet). FR-008/009/012/013: Implemented (endpoints y pruebas). |
| 2026-09-20 | Nuevos: FR-023 (acceso con Google, ya implementado por el equipo), FR-024 (wallet en el navegador), NFR-016/017 (coherencia y pruebas de frontend), C-013 (Vercel). Backend y frontend se especifican como una sola pieza: ver `api_contract.md`, `glossary.md`, `traceability.md`. |
| 2026-09-20 | Decisión de producto (equipo): se retira el rol fijo donante/receptor por cuenta; una cuenta puede donar y publicar causas. UC-011 pasa a mostrar ambas actividades; "Donante" y "Receptor" son roles por caso de uso (ver `glossary.md`). |
