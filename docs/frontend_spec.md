# Frontend Spec: flujo completo desde la web (TC-005)

Especificación de lo que el frontend debe construir para que el flujo **crear → verificar → donar → registrar → retirar** funcione entero desde la interfaz
y podamos ejecutar la prueba de punta a punta [TC-005](test_cases/TC-005-live-end-to-end-with-real-users.md) sin consola, scripts ni llamadas manuales.

Es un documento de trabajo del proyecto AIUP: cada pantalla cita sus casos de uso, reglas y requisitos; cada criterio de aceptación se convierte en una
prueba; el vocabulario sale de [glossary.md](glossary.md) y los endpoints de [api_contract.md](api_contract.md) (una prueba comprueba que todos los endpoints citados
aquí existan). Estado por capa: [traceability.md](traceability.md).

## 1. Alcance y resultado esperado

**Estado (2026-09-20):** todo lo de S1 a S6 está **implementado y con pruebas** (69 pruebas Vitest + MSW, lint y build en verde), en el design system de [design_system.md](design_system.md) (NFR-018) y con
idiomas ES/EN (NFR-019). **Falta ejecutar TC-005 en vivo** con dos personas y sus wallets (§10); hasta entonces los UC de pantalla no pasan de `Implemented`. Antes ya estaban: autenticación (correo y Google),
vinculación de wallet con Rabby, crear causa con foto y publicación on-chain, landing con causas reales. **Backend y contrato: completos** para todo lo de abajo (ver §9).

**Se construye aquí:**

| # | Entrega | Ruta / lugar | UC | Requisitos |
|---|---------|--------------|----|------------|
| S1 | Listado completo de causas verificadas | `/causes` | UC-007 | FR-008 |
| S2 | Detalle de causa: estado, avance, veredicto, donaciones, reintento | `/cause/[id]` | UC-008, UC-006 | FR-009, FR-006 |
| S3 | Donar: `approve` + `donate` + registro con reintentos | bloque dentro de `/cause/[id]` | UC-009, UC-014 | FR-010, FR-020, FR-024, FR-025 |
| S4 | Dashboard completo: mis causas (retirar, reintentar), mis donaciones, donaciones pendientes | `/dashboard` | UC-011, UC-010 | FR-012, FR-013, FR-011, FR-025 |
| S5 | Ajustes de crear causa: pasar al detalle al terminar | `/cause/create` | UC-004, UC-013 | FR-004, FR-019 |
| S6 | Piezas transversales: cliente de API, formato, cadena, seguimiento de transacciones | `lib/`, `components/` | — | NFR-016, NFR-017 |

**Resultado esperado (definición de terminado):** dos personas reales, cada una con su cuenta y su wallet, ejecutan TC-005 completo usando **solo la web**, y la evidencia
(hashes, capturas) queda guardada. Ver el guion en §10.

## 2. Datos y entorno del ensayo

| Elemento | Valor |
|----------|-------|
| Red | HSK Chain testnet, chain id **133** (`0x85`), moneda HSK (18 decimales) |
| RPC / explorador | `https://testnet.hsk.xyz` · `https://testnet-explorer.hskchain.net/` (`/tx/{hash}`, `/address/{dirección}`) |
| Token | MockUSDT `0xD6D6fbbcAe342788DCC18fF2b1cd692c8b8837ec`, **6 decimales**, símbolo `USDT` |
| Contrato | CauseVault `0x591723edf457032ad341366f4654a973fbd0daa9` |
| API | `https://blockbyblock-8wk2.onrender.com/api/v1` (`NEXT_PUBLIC_API_URL` **con** `/api/v1`) |
| Cuentas | Miguel (`miguelangeluribe`) y Carlos (`carlos andres uribe castaneda`), ambas con wallet vinculada |
| Fondos | Carlos: 100 MockUSDT y 0.0997 HSK. Miguel: MockUSDT de sobra y 0.054 HSK. Más MockUSDT: `python -m scripts.fund_wallet --user <nombre> --usdt 100` |
| Estado de partida | Causa **#352** de Carlos Verificada, con **10 USDT** ya donados por Miguel (fila de donación 66): sirve para probar retirar y donar sin crear nada nuevo |
| Servidor | Render gratuito duerme (~50 s): despertarlo abriendo `/api/v1/health` antes de la prueba |

Variables públicas nuevas (`frontend/.env.example`): `NEXT_PUBLIC_TOKEN_ADDRESS` (para `wallet_watchAsset` y leer saldo) y `NEXT_PUBLIC_EXPLORER_URL`. La dirección del contrato
**no** se configura: llega en cada instrucción de firma (`contract`), incluida la de retirar.

## 3. Reglas transversales (aplican a todas las pantallas)

1. **Un solo cliente de API** (`lib/api.ts`): antepone `NEXT_PUBLIC_API_URL`, agrega `Authorization: Bearer <bbb_token>`, parsea JSON y convierte los errores en `ApiError { status, detail }`.
   Los tipos salen de la API: `npx openapi-typescript $API/openapi.json -o lib/api-types.ts`. Nada de tipos escritos a mano que dupliquen el contrato. *(Implementación actual: `lib/api.ts` tiene los tipos alineados a mano con `schemas/common.py`; pendiente generarlos con `openapi-typescript` cuando la API esté despierta.)*
2. **Formato** (`lib/format.ts`): los montos llegan como string de 6 decimales (`"12.500000"`); se muestran como `12,50 USDT` (es-CO, 2 decimales) y **jamás** se
   convierten con `parseFloat` para firmar (se usa `parseUnits(valor, 6)` de `viem`). Direcciones y hashes abreviados (`0x94C5…706f`) con botón de copiar y enlace al explorador.
   Fechas en la zona horaria del usuario.
3. **Estados de causa** con las etiquetas del glosario: `Pending` = En revisión, `Verified` = Verificada, `Rejected` = Rechazada, `Completed` = Completada.
4. **Una causa no tiene rol fijo:** cada pantalla decide qué mostrar comparando `cause.recipient_id` con `user.id`. "Donante" y "Receptor" son perspectivas, no tipos de cuenta.
5. **Sesión:** si la API responde 401/403, se limpia `bbb_token` y se redirige a `/auth/login` conservando la ruta de retorno. El token dura 24 h.
6. **Servidor dormido:** si una petición tarda más de 5 s se muestra "Despertando el servidor…" y se reintenta una vez a los 5 s antes de mostrar el error.
7. **Firma (C-009):** el backend nunca firma por el usuario. El frontend ejecuta las instrucciones de firma con la wallet (`eth_sendTransaction`, patrón de `publishCauseOnChain` en
   `lib/wallet.ts`, codificando con `encodeFunctionData` de `viem`) y confirma **enviando solo el hash**.
8. **Red y cuenta:** antes de firmar, la wallet debe estar en la red 133 (cambiar/agregar automáticamente, ya implementado en `lib/wallet.ts`) **y** la cuenta activa debe ser la
   wallet vinculada del usuario (`user.wallet_address`); si no, se bloquea con el mensaje del §7.
9. **Trazabilidad:** cada página y cada hook lleva `// UC-###` y sus pruebas `describe('UC-### …')`.
10. **Identidad visual:** colores, tipografía, cards, botones y estados salen de [design_system.md](design_system.md) (NFR-018); nada de colores sueltos y cada estado de causa se ve igual en toda pantalla.
11. **Idiomas (NFR-019):** todo texto de interfaz sale del diccionario `lib/i18n/{es,en}.ts` (clave en ambos idiomas; una prueba lo comprueba); montos y fechas siguen el idioma (`12,50 USDT` / `12.50 USDT`); los mensajes de error se traducen en `lib/`. El texto de las causas lo escribe el usuario y no se traduce.
12. **Sin secretos** en variables `NEXT_PUBLIC_*` ni HTML de la API renderizado como HTML.

## 4. Pantallas

### S1 — `/causes` (UC-007, FR-008)

- **Datos:** `GET /causes` (público). Cada elemento: `id`, `title`, `description`, `recipient_name`, `image_url`, `target_amount`, `collected`, `status`, `verification_confidence`, `verification_reason` (si existen).
- **Tarjeta:** foto (`${API_URL}${image_url}`), título, receptor, descripción recortada a 2 líneas, barra de avance `collected/target`, `12,50 de 500,00 USDT (2 %)` y botón "Ver causa" → `/cause/[id]`.
- **Estados:** cargando (esqueletos), vacío A1 ("Aún no hay causas verificadas"), error (con "Reintentar").
- **La landing** (`CausesSection`) enlaza a esta página con "Ver todas".

| AC | Criterio |
|----|----------|
| S1-1 | *Dado* que hay causas Verificadas, *cuando* abro `/causes`, *entonces* veo una tarjeta por causa con título, receptor, foto, monto objetivo y monto recaudado. |
| S1-2 | *Dado* que no hay causas Verificadas, *entonces* veo el mensaje de vacío y no un error. |
| S1-3 | *Cuando* pulso "Ver causa", *entonces* navego a `/cause/{id}`. |
| S1-4 | Las causas Rechazadas, En revisión y Completadas **no** aparecen (UC-007 BR-001). |

### S2 — `/cause/[id]` (UC-008, UC-006)

- **Datos:** `GET /causes/{id}` (público; incluye `recipient_id`, `onchain_cause_id`, `collected`, `donations[]`, `verification_reason`, `verification_confidence`, `image_url`).
- **Contenido (UC-008 pasos 2–5):** foto, título, descripción, receptor, estado (etiqueta), objetivo, recaudado y porcentaje con barra, **veredicto** (motivo y confianza, cuando existan),
  lista de donaciones (monto, wallet abreviada, fecha, enlace a la tx en el explorador). 404 → "Esta causa no existe" (A1).
- **Acciones según estado y quién mira:**

| Estado | Visitante o sin wallet | Otro usuario con wallet | Titular (`recipient_id == user.id`) |
|--------|------------------------|--------------------------|--------------------------------------|
| En revisión | "En revisión" | "En revisión" | "En revisión…" + sondeo (abajo) + **Reintentar verificación** tras 2 min |
| Verificada | "Inicia sesión / vincula tu wallet para donar" | **Bloque Donar (S3)** | Sin bloque Donar; enlace "Ir a mi dashboard" para retirar |
| Rechazada | Motivo del rechazo | Motivo del rechazo | Motivo + botón "Crear otra causa" (una Rechazada no se reintenta) |
| Completada | "Meta alcanzada" | "Meta alcanzada" (sin donar) | "Meta alcanzada" + retirar en el dashboard |

- **Sondeo del veredicto:** mientras `status == "Pending"` y hay sesión del titular, `GET /causes/{id}` cada **5 s**. Al cambiar el estado se detiene y se muestra el resultado. Pasados **2 minutos** aparece
  **Reintentar verificación** (`POST /causes/{id}/verify`): 202 → "Verificación en cola", y vuelve el sondeo; 409 "Verification already in progress" → "Ya estamos verificando tu causa".

| AC | Criterio |
|----|----------|
| S2-1 | *Dado* una causa Verificada, *entonces* veo estado, objetivo, recaudado, porcentaje, veredicto y donaciones con enlace a cada tx. |
| S2-2 | *Dado* una causa inexistente, *entonces* veo "Esta causa no existe" y no una pantalla en blanco. |
| S2-3 | *Dado* que soy el titular y la causa está En revisión, *entonces* la página se actualiza sola en cuanto el estado cambia, sin recargar. |
| S2-4 | *Dado* que soy el titular y pasan 2 minutos En revisión, *entonces* aparece "Reintentar verificación"; al pulsarla se llama a `POST /causes/{id}/verify`. |
| S2-5 | *Dado* una causa Rechazada, *entonces* veo el motivo y la confianza del veredicto (UC-006 BR-009). |
| S2-6 | Un titular **no** ve el bloque Donar en su propia causa. |
| S2-7 | Una causa Completada no muestra el bloque Donar. |

### S3 — Donar (bloque de `/cause/[id]`) (UC-009, UC-014, FR-025)

**Precondiciones para mostrar el formulario:** sesión activa, `user.wallet_address` vinculada, causa Verificada, el usuario no es el titular.

**Formulario:** campo de monto en USDT (mínimo `0.000001`, máximo 6 decimales), saldo de MockUSDT del usuario (`balanceOf` vía `eth_call` al token) y botón "Donar". Validaciones en cliente:
monto > 0, ≤ 6 decimales, ≤ saldo. Un monto inválido nunca llama a la API.

**Secuencia (cada paso visible en un indicador de tres pasos: Aprobar USDT → Donar → Registrar):**

1. `POST /causes/{id}/donate` con `{ "amount": "<valor>" }` → instrucción `{ contract, function: "donate", params: [onchain_cause_id, amount6], approve: { contract, function: "approve", params: [vault, amount6] } }`.
2. Asegurar la red 133 y la cuenta vinculada (§3.8).
3. Leer `allowance(owner, vault)` del token; si ya cubre el monto se omite el `approve`, si no se firma `approve(vault, amount6)` y se espera su recibo (sondeo de `eth_getTransactionReceipt` cada 2 s, tope 90 s; `status == 0x0` → error).
4. Firmar `donate(onchain_cause_id, amount6)` y esperar su recibo.
5. **Antes de registrar**, guardar `{ causeId, txHash, amount, createdAt }` en `localStorage` (`bbb_pending_donations`).
6. `POST /causes/{id}/donations/confirm` con `{ "tx_hash": "<hash>" }`. Si responde **400 "Transaction not confirmed or not a donation"** se reintenta cada **3 s hasta ~30 s** (el RPC tiene nodos desfasados; es idempotente).
7. En 200: se borra el pendiente, se muestra "¡Gracias! Donaste 3,00 USDT" con enlace a la tx y se **recarga** la causa (el recaudado y la lista de donaciones ya incluyen la donación).

**Recuperación (FR-025):** al cargar cualquier página con sesión, si hay donaciones en `bbb_pending_donations` se reintenta su registro una vez y se muestra un aviso
"Tienes una donación pendiente de registrar" con botón "Registrar ahora"; al lograrlo se borra. Sin esto, cerrar la pestaña tras firmar deja el dinero en el contrato y fuera de la plataforma (GAP-034).

| AC | Criterio |
|----|----------|
| S3-1 | *Dado* que dono 3 USDT a una causa Verificada, *entonces* se firman `approve` y `donate` en Rabby y la causa pasa a mostrar recaudado 3, con mi donación en la lista, sin recargar manualmente. |
| S3-2 | *Dado* que el `approve` ya cubre el monto, *entonces* no se pide firmarlo otra vez. |
| S3-3 | *Cuando* cancelo en la wallet, *entonces* veo "Cancelaste la firma" y no se guarda ningún pendiente ni se llama a `confirm`. |
| S3-4 | *Cuando* `confirm` responde "not confirmed", *entonces* la interfaz reintenta sola durante ~30 s y no muestra error mientras tanto. |
| S3-5 | *Cuando* cierro la pestaña entre `donate` y `confirm`, *entonces* al volver a entrar se me ofrece registrar la donación pendiente y queda registrada. |
| S3-6 | Con la wallet activa distinta de la vinculada, no se firma nada y se explica cómo cambiar de cuenta. |
| S3-7 | Con un monto mayor al saldo, el botón queda deshabilitado con el motivo. |
| S3-8 | Registrar dos veces el mismo hash no duplica la donación (UC-014 A2). |

### S4 — `/dashboard` (UC-011, UC-010, UC-006, FR-025)

- **Datos:** `GET /users/me/dashboard` → `user`, `wallet_linked`, `causes[]` (con `available_to_withdraw`, `onchain_cause_id`, `collected`, `verification_*`), `total_donated`, `donations[]`.
- **Secciones:**
  1. **Alerta de wallet** (ya existe) si `wallet_linked` es falso.
  2. **Mis causas:** por causa, estado, avance, enlace a `/cause/[id]`, modal del motivo (ya existe), **Reintentar verificación** (En revisión > 2 min), **Retirar** y, si `available_to_withdraw` es `null`, "—" (nunca 0).
  3. **Mis donaciones:** `total_donated` y la lista (`cause_title`, monto, fecha, enlace a la tx y a la causa); vacío A1: "Aún no has donado" con enlace a `/causes`.
  4. **Donaciones pendientes de registrar** (§S3).
  5. Botón **"Ver USDT en mi wallet"** (`wallet_watchAsset`, `{ type: "ERC20", options: { address: TOKEN, symbol: "USDT", decimals: 6 } }`).

**Retirar (UC-010):** habilitado solo si `available_to_withdraw > 0` y el estado es Verificada o Completada.

1. `POST /causes/{id}/withdraw` → `{ contract, function: "withdrawFunds", params: [onchain_cause_id], amount, to_wallet, … }`. 400 "No funds to withdraw" → A1.
2. Mostrar "Retirarás 10,00 USDT a `0x94C5…706f`" y pedir confirmación.
3. Asegurar red 133 y cuenta vinculada (§3.8); firmar `withdrawFunds`; esperar el recibo.
4. Recargar el dashboard: `available_to_withdraw` debe ser 0; mostrar "Retiro confirmado" con enlace a la tx.

| AC | Criterio |
|----|----------|
| S4-1 | *Dado* que tengo causas y donaciones, *entonces* veo ambas secciones con sus montos y `total_donated`. |
| S4-2 | *Dado* que no he donado ni creado causas, *entonces* veo los estados vacíos (UC-011 A1, A2), no listas rotas. |
| S4-3 | *Dado* una causa con fondos disponibles, *entonces* puedo retirar desde el dashboard; tras el recibo, el disponible pasa a 0 y mi saldo de MockUSDT sube exactamente ese monto. |
| S4-4 | *Dado* `available_to_withdraw` nulo, *entonces* se muestra "—" y el botón Retirar no aparece. |
| S4-5 | Un usuario solo ve sus propios datos (UC-011 BR-002). |
| S4-6 | "Ver USDT en mi wallet" agrega el token con símbolo `USDT` y 6 decimales. |

### S5 — `/cause/create` (ajustes; UC-004, UC-013)

Ya crea, sube la foto y publica. Ajustes: (1) al terminar publicación y foto, **navegar a `/cause/[id]`** mostrando "En revisión" (S2) en vez de quedarse en el formulario; (2) sin wallet vinculada,
redirigir a `/wallet` con el aviso (UC-004 A2); (3) si la causa ya fue publicada (409 "Cause already published on-chain") continuar con la subida de foto sin volver a firmar.

| AC | Criterio |
|----|----------|
| S5-1 | *Dado* que creo una causa completa, *entonces* termino en `/cause/{id}` viendo "En revisión". |
| S5-2 | *Dado* que no tengo wallet vinculada, *entonces* se me lleva a `/wallet` antes de crear nada. |
| S5-3 | *Dado* que la causa ya estaba publicada (409), *entonces* se continúa con la foto sin volver a firmar. |

## 5. Piezas transversales (S6)

| Pieza | Responsabilidad |
|-------|-----------------|
| `lib/api.ts` | Cliente único, errores tipados, reintento por servidor dormido; los tipos están alineados a mano con `schemas/common.py` (pendiente generarlos de `openapi.json`) |
| `lib/format.ts` | `formatUsdt`, `formatPercent`, `shortAddress`, `explorerTxUrl`, `explorerAddressUrl` |
| `lib/chain.ts` | Configuración de la red 133 y fragmentos de ABI: ERC-20 `approve`, `allowance`, `balanceOf`; vault `donate`, `withdrawFunds` |
| `lib/wallet.ts` | Hecho: `sendContractTx`, `waitForReceipt`, `ensureLinkedAccount`, lecturas de saldo y allowance, `watchUsdt`; `publishCauseOnChain` los usa |
| `lib/pendingDonations.ts` | Lectura, escritura y reintento de `bbb_pending_donations` |
| `components/TxStepper.tsx` | Indicador de pasos con estados pendiente / en curso / hecho / error |
| `components/ExplorerLink.tsx`, `components/UsdtAmount.tsx` | Enlace al explorador y montos formateados |
| `components/DonateBlock.tsx`, `PendingDonationsNotice.tsx`, `RetryVerification.tsx`, `cause/DonationsTable.tsx`, `CauseProgress.tsx`, `dashboard/MyCauseRow.tsx`, `MyDonations.tsx` | Piezas de S2, S3 y S4 |
| `lib/i18n/` (`es.ts`, `en.ts`, `content.ts`, `index.ts`), `components/LanguageSwitcher.tsx` | Idiomas ES/EN (NFR-019): diccionario con claves idénticas en ambos idiomas, `useT()` en componentes y `t()` en `lib/` |
| `app/globals.css`, `components/Logo.tsx`, `lib/useSession.ts` | Tokens del design system (NFR-018), logo SVG y sesión reactiva |

## 6. Estados y máquinas

**Verificación (vista del titular):** `Pending` → (sondeo 5 s) → `Verified` | `Rejected`. Tras 2 min en `Pending`: acción "Reintentar".
**Donación (vista del donante):** `idle` → `approving` → `donating` → `registering` → `done`, con `error` recuperable en cualquier paso y persistencia del `txHash` desde `donating`.
**Retiro:** `idle` → `confirming` → `signing` → `waiting` → `done` | `error`.

## 7. Errores: del `detail` de la API a un mensaje para la persona

| `detail` / situación | Mensaje | Acción |
|----------------------|---------|--------|
| 401 / 403 | "Tu sesión expiró. Inicia sesión de nuevo." | Ir a login |
| `Link a wallet first` | "Vincula tu wallet para continuar." | Ir a `/wallet` |
| `Only verified causes` | "Esta causa ya no recibe donaciones." | Recargar la causa |
| `Amount > 0` / 422 | "Escribe un monto válido." | — |
| `Transaction not confirmed or not a donation` / `… a cause creation` | "Aún no vemos tu transacción; seguimos intentando…" | Reintento automático |
| `Transaction does not match this cause and wallet` | "Esa transacción no salió de la wallet vinculada a tu cuenta. Cambia a esa cuenta en Rabby." | — |
| `Transaction already registered` (409) | "Esta donación ya estaba registrada." | Tratar como éxito |
| `Cause already published on-chain` (409) | "Tu causa ya estaba publicada; seguimos con la foto." | Continuar |
| `Verification already in progress` (409) | "Ya estamos verificando tu causa." | Reanudar sondeo |
| `Can only verify Pending causes` | "Esta causa ya tiene resultado." | Recargar |
| `Publish the cause on-chain first` / `Upload evidence first` | "Antes debes publicar la causa / subir la foto." | Guiar al paso |
| `No funds to withdraw` | "No hay fondos para retirar." | Deshabilitar |
| `Only the cause owner can do this` (403) | "Solo el titular de la causa puede hacerlo." | — |
| `Cause not found` (404) | "Esta causa no existe." | Volver al listado |
| `Image > 5 MB` (413) / `Only JPEG and PNG allowed` | "La foto debe ser JPG o PNG de hasta 5 MB." | — |
| Código 4001 de la wallet | "Cancelaste la firma." | — |
| Red equivocada | "Cambia Rabby a la red HSK testnet (133)." | Botón "Cambiar red" |
| Sin respuesta / servidor dormido | "El servidor está despertando; reintentamos en unos segundos." | Reintento |

## 8. Pruebas de frontend (NFR-017)

Herramientas: **Vitest** + **Testing Library** + **MSW** (API simulada con las respuestas del contrato) + un `window.ethereum` simulado. Comandos: `npm run lint`, `npm run build`, `npm test`.
Cada criterio de aceptación es una prueba con este nombre: `describe('UC-008 …')` / `it('S2-3 …')`. Mínimo para dar el flujo por terminado:

| Pantalla | Pruebas |
|----------|---------|
| S1 | S1-1, S1-2, S1-3, S1-4 |
| S2 | S2-1, S2-2, S2-3 (sondeo con reloj simulado), S2-4, S2-5, S2-6, S2-7 |
| S3 | S3-1, S3-2, S3-3, S3-4 (reintento con reloj simulado), S3-5, S3-6, S3-7, S3-8 |
| S4 | S4-1, S4-2, S4-3, S4-4, S4-5, S4-6 |
| S5 | S5-1, S5-2, S5-3 |
| i18n (NFR-019) | Mismas claves y marcadores en ES y EN, el selector cambia la interfaz sin recargar, montos y errores por idioma (`tests/i18n.test.tsx`) |
| `lib/` | `formatUsdt` (redondeo y 6 decimales sin `parseFloat`), `parseUnits` de montos, `mapApiError` (todas las filas del §7), `pendingDonations` (guardar, listar, borrar) |

## 9. Lo que el backend y el contrato ya ofrecen (sin trabajo de backend)

| Necesidad | Endpoint o contrato |
|-----------|---------------------|
| Listado y detalle | `GET /causes`, `GET /causes/{id}` (con `donations`, `collected`, `verification_reason`, `verification_confidence`, `recipient_id`, `onchain_cause_id`, `image_url`) |
| Foto | `GET /causes/{id}/evidence` (`image_url` relativa a la base de la API; oculta mientras está En revisión) |
| Donar | `POST /causes/{id}/donate` (con `approve`) · `POST /causes/{id}/donations/confirm` |
| Retirar | `POST /causes/{id}/withdraw` (instrucción con `amount` y `to_wallet`) |
| Reintentar verificación | `POST /causes/{id}/verify` (202; 409 si ya hay una) |
| Dashboard | `GET /users/me/dashboard` |
| Crear y publicar | `POST /causes` · `POST /causes/{id}/publish` · `POST /causes/{id}/publish/confirm` · `POST /causes/{id}/upload-image` |
| Wallet | `POST /auth/wallet/link` |

## 10. Guion del ensayo de punta a punta (TC-005) y evidencia

Marcar cada paso y guardar la evidencia indicada (hash en el explorador y captura de pantalla).

| # | Quién | Pantalla | Acción | Resultado esperado | Evidencia |
|---|-------|----------|--------|--------------------|-----------|
| 1 | Miguel | `/dashboard` | Entrar con Google; la wallet figura vinculada | Sin alerta de wallet | Captura |
| 2 | Miguel | `/dashboard` | Con la #352 de Carlos ya con 10 USDT, **Carlos** entra y pulsa Retirar (10,00 USDT) | Recibo OK; disponible 0; +10 USDT en su wallet | Hash `withdrawFunds` |
| 3 | Miguel | `/cause/create` | Crea la causa demo (necesidad genuina; foto ensayada 3/3 con `try_ai_verdict`) y publica | Termina en `/cause/{id}` "En revisión" | Hash `createCause` |
| 4 | Miguel | `/cause/[id]` | Espera el veredicto | Pasa a Verificada en < 60 s con motivo y confianza | Captura; hash del veredicto |
| 5 | Carlos | `/causes` → `/cause/[id]` | Encuentra la causa y abre el detalle | Ve avance 0 % | Captura |
| 6 | Carlos | `/cause/[id]` | Dona 3 USDT (`approve` + `donate`) | Registro automático; recaudado 3 | Hashes de `approve` y `donate` |
| 7 | Carlos | `/dashboard` | Revisa "Mis donaciones" | `total_donated` 3, donación en la lista | Captura |
| 8 | Miguel | `/dashboard` | Pulsa Retirar (3,00 USDT) | Recibo OK; +3 USDT en su wallet; disponible 0 | Hash `withdrawFunds` |
| 9 | Ambos | Explorador | Buscan los eventos de la causa | `CauseCreated`, `CauseVerified`, `DonationReceived`, `FundsWithdrawn` | Enlaces |
| 10 | Carlos | `/cause/[id]` | (opcional) Dona el resto hasta el objetivo | La causa pasa a Completada y sale de `/causes` | Captura |

**Variantes que también se prueban:** cerrar la pestaña justo tras firmar `donate` y recuperar el pendiente (S3-5); forzar una causa En revisión sin veredicto y usar "Reintentar verificación" (S2-4);
donar con la cuenta activa equivocada (S3-6).

## 11. Orden de trabajo sugerido (PR pequeños)

| Paso | PR | Depende de |
|------|----|------------|
| 1 | ✅ S6 base: `lib/api.ts` con tipos generados, `lib/format.ts`, `lib/chain.ts`, `sendContractTx` y `waitForReceipt`; instalar Vitest + MSW con una primera prueba | — |
| 2 | ✅ S2 detalle en solo lectura (estado, avance, veredicto, donaciones) + sondeo | 1 |
| 3 | ✅ S1 listado y enlace desde la landing | 1, 2 |
| 4 | ✅ S3 donar (`approve` + `donate` + registro con reintentos + pendientes) | 1, 2 |
| 5 | ✅ S4 dashboard: mis donaciones, retirar, reintentar, ver USDT en la wallet | 1, 4 |
| 6 | ✅ S5 ajustes de crear causa | 2 |
| 7 | Ejecutar el guion del §10 y guardar la evidencia (**en curso**, ver el registro de ejecución de TC-005) | todos |

Los pasos 2 y 3 pueden hacerse en paralelo con el 4 una vez listo el 1.

## 12. Decisiones abiertas

| # | Pregunta | Propuesta |
|---|----------|-----------|
| 1 | ¿El titular puede donar a su propia causa? | No en la interfaz (el contrato sí lo permite). **Aplicada** (S2-6) |
| 2 | ¿Monto mínimo de donación en la interfaz? | 1 USDT como valor por defecto sugerido; el mínimo técnico es 0.000001. **Aplicada**: se sugiere 1 (placeholder) y se acepta cualquier monto válido |
| 3 | ¿Mostrar wallets de donantes? | Sí, abreviadas (ya son públicas en la cadena). **Aplicada** |
| 4 | ¿Retirar parcial? | No: `withdrawFunds` retira todo el saldo (UC-010 BR-003). **Aplicada** |
| 5 | ¿Reintento tras un rechazo? | No: crear una causa nueva (la interfaz lo explica). **Aplicada** |
