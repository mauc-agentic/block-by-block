# Glossary: lenguaje común de Block by Block

Un solo vocabulario para producto, frontend, backend y contrato. Cada término tiene **una** forma en la interfaz (español),
**una** en el código (inglés) y **una** definición. Si aparece una palabra nueva, se agrega aquí antes de usarla en código o pantallas.
Contrato de API: [api_contract.md](api_contract.md). Trazabilidad: [traceability.md](traceability.md).

## Actores

| En la interfaz | Código | Definición |
|----------------|--------|------------|
| Visitante | — | Persona sin sesión; puede explorar causas verificadas (UC-007). |
| Donante | `donor` (`user_type`) | Usuario que aporta USDT a causas verificadas. |
| Receptor | `recipient` (`user_type`) | Usuario que publica una causa y retira lo recaudado. |
| Agente verificador | `agent` | Servicio automatizado con llave propia que registra veredictos en el contrato. Actor de sistema, sin pantalla. |
| Administrador | `owner` | Propietario del contrato; pausa, reanuda y rota el agente (UC-012). Sin pantalla en el MVP. |

## Conceptos del dominio

| En la interfaz | Código (API / BD / TS) | Solidity | Definición |
|----------------|------------------------|----------|------------|
| Causa | `cause`, `Cause` | `Cause` | Necesidad publicada por un receptor, con monto objetivo. |
| Monto objetivo | `target_amount` / `targetAmount` | `targetAmount` | USDT que el receptor busca reunir. |
| Recaudado | `collected` / `collectedAmount` | — | **Suma de las donaciones confirmadas** de la causa. Nunca el saldo del contrato. |
| Disponible para retirar | `available_to_withdraw` | `collected` | Saldo del contrato que el receptor aún no retiró (solo receptor, UC-011). |
| Evidencia | `evidence`, `image_url` | — | Foto que respalda la causa; la evalúa el agente y es consultable (FR-021). |
| Verificación | `verification` (`verified`, `confidence`, `reason`) | `verifyCause` | Veredicto del agente sobre la causa. Solo se aprueba con confianza ≥ 0.80. |
| Publicar en el contrato | `publish`, `onchain_cause_id` | `createCause` | Registrar la causa on-chain; vincula el id de la plataforma con el del contrato (UC-013). |
| Donación | `donation`, `Donation` | `donate`, `DonationReceived` | Aporte confirmado en el contrato; la plataforma guarda un espejo (UC-014). |
| Retirar fondos | — | `withdrawFunds` | El receptor mueve a su wallet todo el saldo disponible de una causa verificada (UC-010). |
| Wallet | `wallet_address` | `address` | Dirección `0x…` del usuario; se vincula demostrando propiedad con una firma (UC-003). |
| Instrucción de firma | `sign_required`, `SignInstruction` | — | Respuesta del backend con lo que el usuario debe firmar en su wallet. El backend nunca firma por él. |
| Hash de transacción | `tx_hash` | — | Identificador de una transacción en HSK; se envía al backend para confirmar. |
| Proveedor de acceso | `auth_provider` (`local` \| `google`) | — | Cómo inicia sesión el usuario. |
| Panel | `dashboard` | — | Resumen personal según el rol (UC-011). |
| USDT | `USDT` | `token` | Stablecoin con **6 decimales**. En testnet: `MockUSDT`. |

## Estados de una causa

| Valor (API / BD / contrato) | Etiqueta en la interfaz | Significado | ¿Recibe donaciones? |
|-----------------------------|-------------------------|-------------|---------------------|
| `Pending` | En revisión | Creada; aún sin veredicto. | No |
| `Verified` | Verificada | El agente la aprobó y quedó registrada on-chain. | Sí |
| `Rejected` | Rechazada | El agente la rechazó; el motivo se conserva. | No |
| `Completed` | Completada | Alcanzó su meta (lo decide el contrato). | No |

Los valores viajan **exactamente** así (PascalCase, en inglés) en API, base de datos y TypeScript; la traducción solo ocurre al mostrarlos.

## Reglas de formato y nombres

| Tema | Regla |
|------|-------|
| JSON de la API | `snake_case`. |
| TypeScript | `camelCase` en variables y props; el cliente de API adapta desde `snake_case`. |
| Montos en pantalla | `12,50 USDT` (2 decimales, coma decimal, sufijo `USDT`). En la API, string con 6 decimales (`"12.500000"`). |
| Direcciones y hashes en pantalla | Abreviados (`0x94C5…706f`), con copia y enlace al explorador `https://testnet-explorer.hskchain.net/`. |
| Identificadores de trazabilidad | `UC-###`, `FR-###`, `NFR-###`, `C-###`, `BR-###`, `TC-###`: estables, nunca se reutilizan. Van en comentarios y nombres de pruebas. |
| Idioma | Interfaz y documentación en español; código, rutas y nombres de campos en inglés. |
| Errores al usuario | Nunca se muestra el `detail` técnico tal cual: cada mensaje conocido se traduce a lenguaje del dominio. |
