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

## Scope

### In scope

- Registro e inicio de sesión de donantes y receptores.
- Vinculación de wallet con prueba de propiedad.
- Creación de causas con foto de evidencia.
- Verificación automática de causas por un agente de IA (OpenRouter) y registro del resultado on-chain.
- Listado y detalle de causas verificadas.
- Donación en stablecoin (USDT, 6 decimales) a través del contrato `CauseVault`.
- Retiro de fondos por el receptor.
- Dashboards de donante y de receptor.

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

## Riesgos y decisiones abiertas

| Riesgo / decisión                              | Probabilidad | Mitigación / decisión pendiente                                           |
|------------------------------------------------|--------------|---------------------------------------------------------------------------|
| Foto falsa o bypass de la IA                   | Media        | Human-in-the-Loop en fase 2; umbral de confianza mínimo en el agente      |
| Timeout de RPC                                 | Media        | Reintentos y RPC de respaldo                                              |
| Timeout de OpenRouter                          | Baja         | Reintentos con backoff exponencial                                        |
| Colusión donante-receptor                      | Baja         | Auditoría pública on-chain                                                |
| Compromiso de la llave privada del agente      | Muy baja     | Llave solo en variables de entorno; en producción, gestor de secretos     |
| Sincronización BD ↔ contrato (id de causa)     | Alta         | **Pendiente:** el `cause_id` del backend y el `causeId` on-chain deben enlazarse (campo `onchain_cause_id`) |
| `withdrawFunds` deja `collected = 0`           | Media        | **Pendiente:** conservar total recaudado histórico separado del saldo retirable |
| Firma de wallet sin validar (TODO en backend)  | Alta         | Se corrige en UC-003 (verificación de firma con web3.py)                  |
