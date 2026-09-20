# Vision: Block by Block

## Mission

Block by Block es una plataforma de donaciones peer-to-peer descentralizada que conecta **donantes** con **receptores**
que tienen necesidades reales y verificadas por IA. Elimina intermediarios y comisiones: el dinero viaja directamente
on-chain, en stablecoins, desde el donante hasta el receptor, y cada movimiento es auditable públicamente.

## Target users

- **Donante:** quiere ayudar a personas con necesidades reales y ver que su dinero llega completo a quien lo necesita.
- **Receptor:** persona o pequeño negocio afectado (p. ej. por un sismo) que necesita recibir ayuda directa sin
  intermediarios.
- **Agente verificador (sistema):** servicio automatizado que evalúa foto y descripción de cada causa y registra el
  resultado on-chain.

## Goals

- Permitir que un receptor pase de registro a causa verificada en menos de 5 minutos.
- Transferir el 100 % de lo donado al receptor (0 % de comisión de plataforma).
- Impedir que se reciban donaciones en causas no verificadas.
- Entregar un MVP funcional en HSK Chain testnet durante el hackathon Ethereum Builders Tour Cali (19–20 de
  septiembre de 2026, ~22 horas).

## Principio de una sola pieza

Frontend, backend y contrato inteligente son **un único producto**: comparten el mismo vocabulario ([glossary.md](glossary.md)), el mismo contrato de API ([api_contract.md](api_contract.md)) y la misma trazabilidad por caso de uso ([traceability.md](traceability.md)). Un cambio de comportamiento empieza en el UC y se propaga a las tres capas antes de darse por terminado.

## Identidad visual

Producto Web3 premium, oscuro y sobrio: **"Linear meets Web3 infrastructure"**. EAG (comunidad/builders) es el color dominante, Ethereum marca lo on-chain y HSK Chain la red y el rendimiento. La confianza manda sobre el efecto: montos, estados y hashes se leen primero. Especificación completa en [design_system.md](design_system.md) (NFR-018).

## Scope

### In scope

- Registro e inicio de sesión de donantes y receptores (correo y contraseña, o cuenta de Google).
- Publicación de la causa en el contrato y registro de donaciones confirmadas en la plataforma (UC-013, UC-014).
- Administración de emergencia del contrato: pausa y rotación del agente (UC-012).
- Vinculación de wallet con prueba de propiedad.
- Creación de causas con foto de evidencia.
- Verificación automática de causas por un agente de IA (OpenRouter) y registro del resultado on-chain.
- Listado y detalle de causas verificadas.
- Donación en stablecoin (USDT, 6 decimales) a través del contrato `CauseVault`.
- Retiro de fondos por el receptor.
- Dashboards de donante y de receptor.
- Registro de la evidencia (imagen) para que el agente y los auditores evalúen la misma foto.

### Out of scope

- Revisión humana de causas (Human-in-the-Loop), reportes de fraude con stake, reputación on-chain e integración de
  rampa de pesos Bre-B: fase 2, post-hackathon.
- Redes distintas de HSK Chain testnet y expansión a otras ciudades.
- Custodia de fondos por parte del backend: el backend nunca firma transacciones de usuarios.

## Constraints

- Contrato en Solidity ^0.8.24 con Foundry; despliegue en HSK Chain testnet.
- Backend en Python/FastAPI; agente en Python con OpenRouter y web3.py.
- Frontend en Next.js sobre Scaffold-ETH.
- Plazo: entrega durante el hackathon (19–20 de septiembre de 2026).
- Repositorio público en GitHub con README y documentación.

## Success measures

- Flujo completo demostrable end-to-end: registro → wallet → causa → verificación IA → donación → retiro.
- Cobertura de pruebas superior al 85 %.
- Contrato desplegado y verificable en HSK testnet.
- Cero fondos donados a causas no verificadas.

## Riesgos y decisiones tomadas

| Riesgo / decisión                              | Probabilidad | Estado / Mitigación                                                       |
|------------------------------------------------|--------------|---------------------------------------------------------------------------|
| Foto falsa o bypass de la IA                   | Media        | ✅ Umbral confianza 0.80 (UC-006 BR-002); Human-in-the-Loop fase 2        |
| Timeout de RPC                                 | Media        | ✅ Reintentos con backoff exponencial (3 intentos, 30s timeout)            |
| Timeout de OpenRouter                          | Baja         | ✅ Reintentos con backoff exponencial (3 intentos)                         |
| Colusión donante-receptor                      | Baja         | ✅ Auditoría pública on-chain (eventos con CA-XXX BC)                     |
| Compromiso de la llave privada del agente      | Media        | 🟡 La llave solo vive en variables de entorno, pero el agente es la wallet personal de Miguel y dueña del contrato (GAP-032) |
| Sincronización BD ↔ contrato (id de causa)     | Alta         | ✅ Campo `onchain_cause_id` en CAUSE model para enlazar IDs                |
| `withdrawFunds` deja `collected = 0`           | Media        | ✅ Diseño: total histórico separado; `collected` es el saldo retirable     |
| Firma de wallet sin validar                    | Alta         | ✅ Validada con eth_account (UC-003 BR-001); falta mensaje de un solo uso (BR-003) |
| Background tasks para agente                   | Alta         | ✅ ThreadPoolExecutor (MVP); Celery/Redis como ruta de escalamiento        |
| Tests y cobertura 85%                          | Media        | ✅ Backend 92 %, contrato 88.5 % (NFR-001); 2 pruebas Foundry fallan (GAP-006) |
| Ciclo de verificación incompleto               | Alta         | ✅ Cerrado y verificado en HSK testnet (FR-019, FR-021, FR-022; `scripts/e2e_verification.py`) |
| Donaciones sin reflejo en la plataforma        | Alta         | ✅ UC-014 y dashboards (UC-011) implementados y verificados (`scripts/e2e_donation.py`) |
| RPC de HSK con nodos desfasados                | Media        | 🟡 `confirm` puede responder "not confirmed" justo tras firmar; el cliente reintenta (UC-014 A4, GAP-023) |
| Donaciones sobre la meta en el contrato        | Media        | 🔲 `donate` solo exige `verified`; corregir en el contrato (GAP-022, UC-009 A4) |
| Nonce del agente con verificaciones simultáneas | Media       | ✅ Nonce `pending` y bloqueo de envío en `sign_verification_tx` |
| Secreto versionado por error                   | Media        | 🟡 `SECRET_KEY` rotado; el historial de `main` volvió a contenerlo por un merge (GAP-017) |
| Token real vs MockUSDT                         | Media        | 🟡 Testnet usa `MockUSDT` (C-012); configurar USDT real por constructor en mainnet |
| La IA rechaza una foto legítima o una petición sin necesidad real | Media | 🟡 Ocurrió en vivo (causa #348, confianza 0.90): sin revisión humana y sin reintento tras un rechazo; ensayar con `scripts/try_ai_verdict.py`; la interfaz ya muestra el motivo del rechazo (GAP-033) |
| Donación on-chain sin registro en la plataforma | Media       | 🟡 Depende de que el cliente llame a `donations/confirm`; falta reconciliar por eventos (GAP-034) |
| Frontend sin firma de transacciones            | Alta         | 🔲 Impide correr el flujo completo desde la interfaz (TC-005); pantallas y firma pendientes (GAP-024, GAP-026) |
| Cambio de esquema en la base compartida        | Media        | ✅ Todo cambio es un script versionado en `backend/migrations/manual/` con aviso al equipo (regla de CLAUDE.md) |
| Render gratuito duerme                          | Baja         | 🟡 ~50 s de arranque en frío; despertar el servicio antes de la demostración (GAP-035) |
