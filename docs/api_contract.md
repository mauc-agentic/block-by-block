# API Contract: Block by Block

Contrato único entre **frontend**, **backend** y **contrato inteligente**. Es la fuente de verdad del "idioma" común: si el código
de una capa se aparta de este documento, se corrige el código o se cambia primero este documento (y el UC del que deriva).
Vocabulario y estados: [glossary.md](glossary.md). Trazabilidad por capa: [traceability.md](traceability.md).

## 1. Convenciones

| Tema | Regla |
|------|-------|
| Base URL | `{API_URL}/api/v1` (frontend: `NEXT_PUBLIC_API_URL`, hoy **con** el sufijo `/api/v1` en `frontend/.env.example`). |
| Formato | JSON UTF-8, nombres de campo en **snake_case** (`target_amount`). El frontend los adapta a camelCase en su capa de cliente, nunca en la API. |
| Montos | USDT con 6 decimales. En JSON viajan como **string decimal** (`"12.500000"`); nunca como número flotante. Al firmar en la wallet se convierten a enteros de 6 decimales (`12.5` → `12500000`). |
| Fechas | ISO 8601 en UTC, sin zona (`2026-09-20T06:43:50.729513`). |
| Identificadores | `id` de la plataforma (entero) vs `onchain_cause_id` (id en `CauseVault`). Las instrucciones de firma usan **siempre** el id on-chain. |
| Direcciones | `0x` + 40 hex. La API devuelve direcciones del contrato en formato checksum; las wallets de usuarios se guardan en minúsculas. |
| Autenticación | `Authorization: Bearer <access_token>`; el token dura 24 h (NFR-007). Sin token o inválido: 401/403. |
| Errores | `{"detail": "<mensaje>"}` con 400 (regla de negocio), 401/403 (sesión o permiso), 404, 409 (conflicto/duplicado), 413 (imagen > 5 MB), 422 (validación de esquema). |
| CORS | El backend solo acepta los orígenes de `ALLOWED_ORIGINS`; el frontend desplegado debe estar en esa lista. |
| Sin custodia | El backend nunca firma por un usuario (C-009): entrega **instrucciones de firma** y confirma leyendo la cadena. |

## 2. Patrones comunes

### 2.1 Instrucción de firma (`sign_required`)

Respuestas de `publish` y `donate`. El frontend las ejecuta con la wallet del usuario, en el orden indicado:

```json
{ "status": "sign_required", "contract": "0x<CauseVault checksum>", "function": "donate",
  "params": [4, 3000000], "message": "Sign to donate 3 USDT to '...'",
  "approve": { "contract": "0x<token>", "function": "approve", "params": ["0x<CauseVault>", 3000000] } }
```

- `donate`: primero `approve` (si el token lo requiere), luego `donate`. `params[0]` es el `onchain_cause_id`.
- `publish`: `params = [title, description, target_amount_6dec]`; no lleva `approve`.

### 2.2 Confirmación por lectura de la cadena

Tras firmar, el frontend envía **solo el hash** de la transacción; el backend lee el recibo y el evento (`CauseCreated`,
`DonationReceived`), valida titularidad y registra. Endpoints: `POST /causes/{id}/publish/confirm` y
`POST /causes/{id}/donations/confirm`.

- **Reintento obligatorio:** el RPC de HSK reparte peticiones entre nodos con desfase; justo tras firmar puede responder
  `400 "Transaction not confirmed or not a ..."`. El frontend reintenta cada 2–3 s hasta ~30 s antes de mostrar el error (UC-014 A4, GAP-023).
- **Idempotencia:** repetir el mismo hash devuelve la misma donación (UC-014 A2); un hash ya usado por otro usuario o causa da 409.

### 2.3 Ciclo de vida de una causa

```
Pending ──(publish/confirm + upload-image)──► verificación del agente ──► Verified ──(meta alcanzada)──► Completed
                                                                     └──► Rejected
```

| Estado | Visible en `GET /causes` | Acepta donaciones | Evidencia servida |
|--------|--------------------------|-------------------|-------------------|
| Pending | No | No | No (404) |
| Verified | Sí | Sí | Sí |
| Rejected | No | No | Sí (auditoría) |
| Completed | No | No | Sí |

La verificación es asíncrona: `upload-image` responde de inmediato (`queued for verification`) y el estado cambia cuando el agente
confirma el veredicto on-chain (decenas de segundos). El frontend consulta `GET /causes/{id}` hasta que el estado deje de ser `Pending`. Si pasan más de ~2 minutos, puede ofrecer
**"Reintentar verificación"** (`POST /causes/{id}/verify`, solo el titular; 202 si se encola, 400 si falta publicar o subir evidencia, 409 si ya hay una en curso).
El backend además retoma solo las verificaciones interrumpidas por un reinicio.

## 3. Mapa del contrato inteligente (`CauseVault`)

| Función | Quién firma | Endpoint de la API que la prepara/confirma | UC |
|---------|-------------|--------------------------------------------|----|
| `createCause(title, description, target)` | Receptor | `publish` → `publish/confirm` | UC-013 |
| `verifyCause(id, verified, hash)` | Agente (backend) | Automática tras `upload-image` | UC-006 |
| `approve(spender, amount)` (token) | Donante | Incluida en la respuesta de `donate` | UC-009 |
| `donate(id, amount)` | Donante | `donate` → `donations/confirm` | UC-009, UC-014 |
| `withdrawFunds(id)` | Receptor | Ninguno: solo on-chain; el saldo se ve en `GET /users/me/dashboard` (`available_to_withdraw`; el `id` para firmar es `onchain_cause_id`) | UC-010 |
| `pause`, `unpause`, `setAgent` | Administrador | Ninguno | UC-012 |

## 4. Correspondencia de tipos (frontend ⇄ backend)

| Backend (Pydantic) | Frontend (TypeScript) | Estado |
|--------------------|-----------------------|--------|
| `UserResponse` | `AuthUser` (`frontend/lib/auth.ts`) | Alineado (incluye `auth_provider`) |
| `TokenResponse` | `TokenResponse` | Alineado |
| `CauseListResponse` | `Cause` (`frontend/lib/causes.ts`) | **Desalineado** (ver 4.1) |
| `CauseResponse`, `DashboardResponse`, `DonationResponse`, `PublishInstruction`, `DonationRecordResponse` | — | Sin tipo en el frontend todavía |

### 4.1 Diferencias pendientes en `Cause`

| Campo del frontend | Campo de la API | Acción |
|--------------------|-----------------|--------|
| `targetAmount: number` | `target_amount: string` | El cliente convierte con `Number()` solo para mostrar; nunca para firmar. |
| `collectedAmount: number` | `collected: string` | Igual; nombre distinto: el cliente adapta. |
| `imageUrl` | `image_url` (ruta relativa a la API) | Backend lo entrega (UC-007 paso 3). |
| `description`, `recipientName` | `description`, `recipient_name` | Backend los entrega; UC-007 los incluye en la tarjeta. |
| `status: "Verified"` | `status` | El listado solo devuelve `Verified`. |

Datos que la API **nunca** expone de terceros: correo, hash de contraseña y `external_id`. Del donante solo se muestra
`donor_wallet`; del receptor, `recipient_name` (nombre de usuario).

## 5. Endpoints y esquemas (generado desde el código)

> Generado por `python -m scripts.generate_api_contract`. No editar a mano: la prueba `test_api_contract_doc` falla si el bloque no
> coincide con la API real.

<!-- BEGIN GENERATED -->
### Endpoints

| Método | Ruta | Auth | UC | Cuerpo | Respuesta 200 |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/google/login` | — | UC-002 | GoogleLoginRequest | TokenResponse |
| POST | `/api/v1/auth/google/signup` | — | UC-001 | GoogleSignupRequest | TokenResponse |
| POST | `/api/v1/auth/login` | — | UC-002 | UserLogin | TokenResponse |
| POST | `/api/v1/auth/signup` | — | UC-001 | UserCreate | TokenResponse |
| POST | `/api/v1/auth/wallet/link` | Bearer | UC-003 | WalletLinkRequest | UserResponse |
| GET | `/api/v1/causes` | — | UC-007 | — | list[CauseListResponse] |
| POST | `/api/v1/causes` | Bearer | UC-004 | CauseCreate | CauseResponse |
| GET | `/api/v1/causes/{cause_id}` | — | UC-008 | — | CauseResponse |
| POST | `/api/v1/causes/{cause_id}/donate` | Bearer | UC-009 | DonateRequest | DonationResponse |
| POST | `/api/v1/causes/{cause_id}/donations/confirm` | Bearer | UC-014 | DonationConfirmRequest | DonationRecordResponse |
| GET | `/api/v1/causes/{cause_id}/evidence` | — | — | — | object |
| POST | `/api/v1/causes/{cause_id}/publish` | Bearer | UC-013 | — | PublishInstruction |
| POST | `/api/v1/causes/{cause_id}/publish/confirm` | Bearer | UC-013 | PublishConfirmRequest | CauseResponse |
| POST | `/api/v1/causes/{cause_id}/upload-image` | Bearer | UC-005, UC-006 | multipart (image) | object |
| POST | `/api/v1/causes/{cause_id}/verify` | Bearer | UC-006 | — | — |
| GET | `/api/v1/health` | — | — | — | object |
| GET | `/api/v1/users/me/dashboard` | Bearer | UC-011 | — | DashboardResponse |

### Esquemas

**CauseCreate**

| Campo | Tipo | Requerido |
|---|---|---|
| `title` | string | sí |
| `description` | string | sí |
| `target_amount` | decimal (string) | sí |

**CauseListResponse**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer | sí |
| `title` | string | sí |
| `description` | string | sí |
| `recipient_name` | string | sí |
| `image_hash` | string | null | no |
| `image_url` | string | null | no |
| `target_amount` | decimal (string) | sí |
| `collected` | decimal (string) | no |
| `status` | string | sí |

**CauseResponse**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer | sí |
| `recipient_id` | integer | sí |
| `onchain_cause_id` | integer | null | no |
| `title` | string | sí |
| `description` | string | sí |
| `image_hash` | string | null | no |
| `target_amount` | decimal (string) | sí |
| `status` | string | sí |
| `verification_hash` | string | null | no |
| `verification_reason` | string | null | no |
| `verification_confidence` | decimal (string) | null | no |
| `created_at` | datetime (ISO 8601, UTC) | sí |
| `recipient_name` | string | null | no |
| `image_url` | string | null | no |
| `collected` | decimal (string) | no |
| `donations` | list[DonationItem] | no |

**DashboardCause**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer | sí |
| `recipient_id` | integer | sí |
| `onchain_cause_id` | integer | null | no |
| `title` | string | sí |
| `description` | string | sí |
| `image_hash` | string | null | no |
| `target_amount` | decimal (string) | sí |
| `status` | string | sí |
| `verification_hash` | string | null | no |
| `verification_reason` | string | null | no |
| `verification_confidence` | decimal (string) | null | no |
| `created_at` | datetime (ISO 8601, UTC) | sí |
| `recipient_name` | string | null | no |
| `image_url` | string | null | no |
| `collected` | decimal (string) | no |
| `donations` | list[DonationItem] | no |
| `available_to_withdraw` | decimal (string) | null | no |

**DashboardResponse**

| Campo | Tipo | Requerido |
|---|---|---|
| `user` | UserResponse | sí |
| `wallet_linked` | boolean | sí |
| `causes` | list[DashboardCause] | sí |
| `total_donated` | decimal (string) | no |
| `donations` | list[DonorDonationItem] | no |

**DonateRequest**

| Campo | Tipo | Requerido |
|---|---|---|
| `amount` | decimal (string) | sí |

**DonationConfirmRequest**

| Campo | Tipo | Requerido |
|---|---|---|
| `tx_hash` | string | sí |

**DonationItem**

| Campo | Tipo | Requerido |
|---|---|---|
| `amount` | decimal (string) | sí |
| `tx_hash` | string | sí |
| `donor_wallet` | string | null | no |
| `created_at` | datetime (ISO 8601, UTC) | sí |

**DonationRecordResponse**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer | sí |
| `cause_id` | integer | sí |
| `amount` | decimal (string) | sí |
| `tx_hash` | string | sí |
| `created_at` | datetime (ISO 8601, UTC) | sí |
| `cause_status` | string | sí |

**DonationResponse**

| Campo | Tipo | Requerido |
|---|---|---|
| `status` | string | no |
| `contract` | string | sí |
| `function` | string | no |
| `params` | list[object] | sí |
| `message` | string | sí |
| `approve` | object | null | no |

**DonorDonationItem**

| Campo | Tipo | Requerido |
|---|---|---|
| `cause_id` | integer | sí |
| `cause_title` | string | sí |
| `amount` | decimal (string) | sí |
| `tx_hash` | string | sí |
| `created_at` | datetime (ISO 8601, UTC) | sí |

**GoogleLoginRequest**

| Campo | Tipo | Requerido |
|---|---|---|
| `id_token` | string | sí |

**GoogleSignupRequest**

| Campo | Tipo | Requerido |
|---|---|---|
| `id_token` | string | sí |

**PublishConfirmRequest**

| Campo | Tipo | Requerido |
|---|---|---|
| `tx_hash` | string | sí |

**PublishInstruction**

| Campo | Tipo | Requerido |
|---|---|---|
| `status` | string | no |
| `contract` | string | sí |
| `function` | string | no |
| `params` | list[object] | sí |
| `message` | string | sí |

**TokenResponse**

| Campo | Tipo | Requerido |
|---|---|---|
| `access_token` | string | sí |
| `token_type` | string | no |
| `user` | UserResponse | sí |

**UserCreate**

| Campo | Tipo | Requerido |
|---|---|---|
| `username` | string | sí |
| `email` | string | sí |
| `password` | string | sí |

**UserLogin**

| Campo | Tipo | Requerido |
|---|---|---|
| `email` | string | sí |
| `password` | string | sí |

**UserResponse**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer | sí |
| `username` | string | sí |
| `email` | string | sí |
| `auth_provider` | string | no |
| `wallet_address` | string | null | no |
| `created_at` | datetime (ISO 8601, UTC) | sí |

**WalletLinkRequest**

| Campo | Tipo | Requerido |
|---|---|---|
| `wallet_address` | string | sí |
| `signature` | string | sí |
| `message` | string | sí |
<!-- END GENERATED -->
