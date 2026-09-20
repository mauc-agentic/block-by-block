# Entity Model

## Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ CAUSE : "creates"
    USER ||--o{ DONATION : "makes"
    CAUSE ||--o{ DONATION : "receives"
    CAUSE ||--o{ VERIFICATION : "is evaluated by"
```

### USER

Cuenta de la plataforma, con rol de donante o receptor y wallet opcional.

| Attribute       | Description                           | Data Type | Length/Precision | Validation Rules                    |
|-----------------|---------------------------------------|-----------|------------------|-------------------------------------|
| id              | Unique identifier                     | Long      | 19               | Primary Key, Sequence               |
| username        | Nombre público del usuario            | String    | 100              | Not Null, Unique                    |
| email           | Correo de acceso                      | String    | 255              | Not Null, Unique, Format: Email     |
| hashed_password | Contraseña con hash bcrypt            | String    | 255              | Not Null                            |
| wallet_address  | Dirección de wallet vinculada         | String    | 42               | Optional, Unique                    |
| user_type       | Rol del usuario                       | String    | 20               | Not Null, Values: donor, recipient  |
| created_at      | Fecha de creación                     | DateTime  | -                | Not Null                            |

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
