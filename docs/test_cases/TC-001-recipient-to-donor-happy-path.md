# Test Case: Recipient To Donor Happy Path

## Overview

**ID:** TC-001  
**Goal:** Un receptor publica una causa que la IA verifica, un donante la financia y el receptor retira los fondos  
**Priority:** Critical  
**Status:** Draft

## Roles

- Receptor (se registra, crea la causa, sube la foto y retira)
- Donante (se registra, explora y dona)
- Agente Verificador (evalúa la causa)

## Preconditions

- Contrato `CauseVault` desplegado (testnet: `0x591723edf457032ad341366f4654a973fbd0daa9`, token `MockUSDT` `0xD6D6fbbcAe342788DCC18fF2b1cd692c8b8837ec`) en HSK Chain testnet (o red local de Foundry) con el agente autorizado
- Dos wallets de prueba con gas; la wallet del donante tiene al menos 100 USDT de prueba
- El proveedor de IA responde (o está simulado con veredicto positivo)

## Flow

| Step | Name                    | Description                                                            | Test Data                                                                             | Use Case                                              |
|------|-------------------------|------------------------------------------------------------------------|---------------------------------------------------------------------------------------|-------------------------------------------------------|
| 1    | Registrar receptor      | El receptor crea su cuenta con rol receptor                            | username: maria_tienda, email: maria@example.com, contraseña: Pass1234!, rol: recipient | [UC-001](../use_cases/UC-001-register-account.md)     |
| 2    | Vincular wallet         | El receptor conecta y firma con su wallet                              | wallet receptor de prueba                                                             | [UC-003](../use_cases/UC-003-link-wallet.md)          |
| 3    | Crear causa             | El receptor publica la necesidad                                       | título: Reconstruir mi tienda, descripción: Sismo destruyó vitrinas, objetivo: 500 USDT | [UC-004](../use_cases/UC-004-create-cause.md)         |
| 3.1  | Publicar on-chain       | El receptor firma la publicación de la causa y queda enlazada con su identificador on-chain | -                                                                              | [UC-013](../use_cases/UC-013-publish-cause-onchain.md) |
| 4    | Subir foto              | El receptor sube la foto del daño y la causa queda en revisión         | foto: dano_tienda.jpg (JPEG, 1 MB)                                                    | [UC-005](../use_cases/UC-005-upload-cause-evidence.md) |
| 5    | Verificar causa         | El agente evalúa y registra el veredicto positivo                      | veredicto: verified=true, confianza: 0.95                                             | [UC-006](../use_cases/UC-006-verify-cause-with-ai.md) |
| 6    | Verificar estado        | La causa figura como Verified                                          | -                                                                                     | -                                                     |
| 7    | Registrar donante       | El donante crea su cuenta con rol donante                              | username: juan_donante, email: juan@example.com, contraseña: Pass1234!, rol: donor    | [UC-001](../use_cases/UC-001-register-account.md)     |
| 8    | Vincular wallet         | El donante conecta y firma con su wallet                               | wallet donante de prueba                                                              | [UC-003](../use_cases/UC-003-link-wallet.md)          |
| 9    | Explorar causas         | El donante ve "Reconstruir mi tienda" en el listado                    | -                                                                                     | [UC-007](../use_cases/UC-007-browse-verified-causes.md) |
| 10   | Ver detalle             | El donante abre la causa y ve avance 0 %                               | -                                                                                     | [UC-008](../use_cases/UC-008-view-cause-detail.md)    |
| 11   | Donar                   | El donante dona 100 USDT y confirma en su wallet                       | monto: 100 USDT                                                                       | [UC-009](../use_cases/UC-009-donate-to-cause.md)      |
| 11.1 | Registrar donación      | La plataforma registra la donación confirmada con su transacción      | tx de la donación                                                                     | [UC-014](../use_cases/UC-014-register-donation.md)    |
| 12   | Ver dashboard receptor  | El receptor ve 100 USDT disponibles en su causa                        | -                                                                                     | [UC-011](../use_cases/UC-011-view-dashboard.md)       |
| 13   | Retirar fondos          | El receptor retira y firma en su wallet                                | -                                                                                     | [UC-010](../use_cases/UC-010-withdraw-funds.md)       |

## Validation

1. **Fondos completos**: la wallet del receptor aumenta exactamente 100 USDT y el contrato queda con saldo 0 para la causa.
2. **Auditoría pública**: existen los eventos de verificación, donación (100 USDT) y retiro (100 USDT) para la causa.
3. **Dashboard del donante**: muestra una donación de 100 USDT a "Reconstruir mi tienda".
4. **Avance de la causa**: el detalle muestra 100 de 500 USDT recaudados (20 %).

## Postconditions

- Existen un receptor, un donante y una causa Verified con una donación registrada
- Los fondos disponibles de la causa son cero tras el retiro
