# Entity Model

## Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ CAUSE : "creates"
    USER ||--o{ DONATION : "makes"
    CAUSE ||--o{ DONATION : "receives"
    CAUSE ||--o{ VERIFICATION : "is evaluated by"
    CAUSE ||--o| EVIDENCE : "is supported by"
```

### USER

Cuenta de la plataforma, con rol de donante o receptor y wallet opcional. Puede autenticarse con contraseña propia o con un proveedor externo (OAuth).

| Attribute       | Description                           | Data Type | Length/Precision | Validation Rules                                           |
|-----------------|---------------------------------------|-----------|------------------|-------------------------------------------------------------|
| id              | Unique identifier                     | Long      | 19               | Primary Key, Sequence                                       |
| username        | Nombre público del usuario            | String    | 100              | Not Null, Unique                                             |
| email           | Correo de acceso                      | String    | 255              | Not Null, Unique, Format: Email                              |
| hashed_password | Contraseña con hash bcrypt            | String    | 255              | Optional (requerido si auth_provider = local)                |
| auth_provider   | Proveedor de autenticación            | String    | 20               | Not Null, Values: local, google, Default: local              |
| external_id     | Identificador en el proveedor externo | String    | 255              | Optional, Unique (requerido si auth_provider ≠ local)        |
| wallet_address  | Dirección de wallet vinculada         | String    | 42               | Optional, Unique                                             |
| user_type       | Rol del usuario                       | String    | 20               | Not Null, Values: donor, recipient                           |
| created_at      | Fecha de creación                     | DateTime  | -                | Not Null                                                     |

### CAUSE

Necesidad publicada por un receptor, verificable y con monto objetivo.

| Attribute         | Description                                   | Data Type | Length/Precision | Validation Rules                                               |
|-------------------|-----------------------------------------------|-----------|------------------|----------------------------------------------------------------|
| id                | Unique identifier                             | Long      | 19               | Primary Key, Sequence                                          |
| recipient_id      | Receptor que crea la causa                    | Long      | 19               | Not Null, Foreign Key (USER.id)                                |
| onchain_cause_id  | Identificador de la causa en CauseVault       | Long      | 19               | Optional, Unique                                               |
| title             | Título de la causa                            | String    | 255              | Not Null                                                       |
| description       | Descripción de la necesidad                   | String    | 2000             | Not Null                                                       |
| image_hash        | Hash IPFS de la foto de evidencia             | String    | 100              | Optional                                                       |
| target_amount     | Monto objetivo en USDT                        | Decimal   | 18,6             | Not Null, Min: 0.000001                                        |
| status            | Estado de la causa                            | String    | 20               | Not Null, Values: Pending, Verified, Rejected, Completed       |
| verification_hash | Hash IPFS del análisis de IA                  | String    | 100              | Optional                                                       |
| created_at        | Fecha de creación                             | DateTime  | -                | Not Null                                                       |

### DONATION

Donación registrada on-chain por un donante a una causa; el backend guarda un espejo para consulta.

| Attribute  | Description                          | Data Type | Length/Precision | Validation Rules                  |
|------------|--------------------------------------|-----------|------------------|-----------------------------------|
| id         | Unique identifier                    | Long      | 19               | Primary Key, Sequence             |
| cause_id   | Causa que recibe la donación         | Long      | 19               | Not Null, Foreign Key (CAUSE.id)  |
| donor_id   | Donante que aporta                   | Long      | 19               | Not Null, Foreign Key (USER.id)   |
| amount     | Monto donado en USDT                 | Decimal   | 18,6             | Not Null, Min: 0.000001           |
| tx_hash    | Hash de la transacción on-chain      | String    | 66               | Not Null, Unique                  |
| created_at | Fecha de la donación                 | DateTime  | -                | Not Null                          |

### VERIFICATION

Resultado de cada evaluación del agente de IA sobre una causa.

| Attribute  | Description                                  | Data Type | Length/Precision | Validation Rules                  |
|------------|----------------------------------------------|-----------|------------------|-----------------------------------|
| id         | Unique identifier                            | Long      | 19               | Primary Key, Sequence             |
| cause_id   | Causa evaluada                               | Long      | 19               | Not Null, Foreign Key (CAUSE.id)  |
| verified   | Resultado de la evaluación                   | Boolean   | 1                | Not Null                          |
| confidence | Nivel de confianza del modelo                | Decimal   | 3,2              | Not Null, Min: 0, Max: 1          |
| reason     | Explicación breve del modelo                 | String    | 500              | Not Null                          |
| tx_hash    | Hash de la tx `verifyCause` en HSK           | String    | 66               | Optional, Unique                  |
| created_at | Fecha de la evaluación                       | DateTime  | -                | Not Null                          |

### EVIDENCE

Imagen de evidencia subida por el receptor y evaluada por el agente (UC-005, FR-021). Una por causa; se reemplaza mientras la causa está Pending.

| Attribute    | Description                              | Data Type | Length/Precision | Validation Rules                        |
|--------------|------------------------------------------|-----------|------------------|-----------------------------------------|
| id           | Unique identifier                        | Long      | 19               | Primary Key, Sequence                   |
| cause_id     | Causa a la que pertenece                 | Long      | 19               | Not Null, Unique, Foreign Key (CAUSE.id) |
| content_type | Tipo de la imagen                        | String    | 20               | Not Null, Values: image/jpeg, image/png |
| sha256       | Huella SHA-256 del contenido             | String    | 64               | Not Null                                |
| data         | Contenido binario de la imagen           | Binary    | máx 5 MB         | Not Null                                |
| created_at   | Fecha de carga                           | DateTime  | -                | Not Null                                |

## Implementation Notes (auditoría 2026-09-20)

Diferencias entre este modelo y `backend/app/db/models/base.py`. El modelo lógico manda; estas filas son deuda de implementación.

| Entidad      | Atributo / regla                     | Modelo lógico                                   | Código actual                                                                 | Acción                                                                 |
|--------------|--------------------------------------|-------------------------------------------------|--------------------------------------------------------------------------------|------------------------------------------------------------------------|
| USER         | auth_provider, external_id           | Presentes (OAuth Google, UC-001 A3)             | Implementados por el equipo (rama `auth`, `migrations/manual/2026-09-20_google_auth.sql`) | Resuelto (FR-023)                                                  |
| USER         | hashed_password                      | Optional (solo local)                           | `nullable=True`; es Null cuando `auth_provider` ≠ local                       | Resuelto                                                           |
| USER         | hashed_password (algoritmo)          | bcrypt                                          | argon2id (NFR-006 actualizado)                                                 | Modelo actualizado: hash adaptativo                                    |
| CAUSE        | onchain_cause_id                     | Enlaza con CauseVault                           | Asignado por `POST /causes/{id}/publish/confirm` leyendo el evento `CauseCreated` | Resuelto (UC-013)                                                   |
| CAUSE        | image_hash                           | Hash IPFS de la foto                            | SHA-256 completo (64 hex) de la imagen guardada en EVIDENCE                     | Resuelto (FR-021); no es un CID IPFS                                   |
| CAUSE        | status                               | Pending, Verified, Rejected, Completed          | Verified/Rejected los fija el agente tras confirmar el veredicto on-chain; Completed lo refleja UC-014 leyendo el contrato | Resuelto (UC-006 BR-005, UC-014 BR-004)        |
| CAUSE        | verification_hash                    | Hash IPFS del análisis                          | SHA-256 completo del veredicto JSON canónico, persistido y registrado on-chain  | Resuelto; huella SHA-256, no CID IPFS                                  |
| VERIFICATION | cause_id                             | Una fila por evaluación (relación 1:N)          | `unique=True` (1:1); una reevaluación actualiza la fila (upsert)                | Decidido: 1:1 con upsert                                               |
| DONATION     | (toda la entidad)                    | Espejo de donaciones on-chain                   | Escrita solo por `POST /causes/{id}/donations/confirm` tras leer `DonationReceived`; `tx_hash` único | Resuelto (UC-014)                                                  |
| Contrato     | Cause, Donation on-chain             | Fuente de verdad de donaciones y verificación   | `CauseVault`: `Cause{verified,collected,...}`, `Donation`, eventos             | Documentado en UC-009/010, NFR-011                                     |
| CAUSE        | collected (derivado)                 | Monto recaudado visible en listado y detalle    | Suma de `DONATION.amount` de la causa; no es el saldo del contrato (que `withdrawFunds` pone en 0) | Definido (UC-014 BR-005); no se persiste |
| DONATION     | donor_wallet (derivado)              | Wallet pública del donante en el detalle        | `USER.wallet_address` del donante; nunca se expone email ni username           | Definido (UC-008 BR-001)                                               |
| Esquema      | Creación de tablas                   | Migraciones versionadas (NFR-013)               | `Base.metadata.create_all` al arrancar; la tabla `evidences` se creó así       | Pendiente Alembic (GAP-013)                                            |
| USER         | user_type (esquema en Supabase)      | Not Null, `donor` \| `recipient`                | La tabla `users` de la BD compartida **no tiene la columna** (2026-09-20), aunque modelo, API y frontend la usan | Incidente: restaurar la columna (GAP-028)                          |
