# Testing Status — Block by Block

**Medido:** 2026-09-20 (`pytest --cov=app` en `backend/`, `forge test`, `forge coverage` en `contracts/`).
**Regla:** las pruebas de backend corren contra **Supabase real** (session pooler) y HSK testnet. No hay SQLite.

## Resultados

| Suite                         | Resultado                       | Notas                                                                |
|-------------------------------|---------------------------------|----------------------------------------------------------------------|
| `backend/tests/unit`          | 19 pasan                        | Firma de wallet (UC-003 BR-001), conversiones USDT, hash de imagen   |
| `backend/tests/integration`   | 16 pasan, 3 skip                | Supabase (signup, login, listado, flujo autenticado) + HSK RPC/ABI   |
| **pytest total**              | **35 pasan, 3 skip, 0 fallan**  | Cobertura de líneas **66 %** (meta 85 %)                             |
| `contracts/test` (Foundry)    | 7 pasan, **2 fallan**           | `test_TC002_RejectedCauseBlocksFunds`, `test_GetRecipientCauses`     |
| Cobertura del contrato        | 88.5 % líneas, 69.7 % ramas     | `forge coverage`                                                     |

## Cómo ejecutar

```bash
# Backend (requiere backend/.env con SUPABASE_DB_URL del session pooler y credenciales HSK)
cd backend && source ../venv/bin/activate
pytest tests/ -v --cov=app --cov-report=term-missing

# Contrato
cd contracts && forge test -vv && forge coverage --report summary
```

Las pruebas de integración crean usuarios `e2e_*` en Supabase y los eliminan al terminar.

## Brechas de prueba (ver `docs/IMPLEMENTATION-STATUS.md`)

- Sin prueba: UC-001 A1/BR-002 (duplicados), UC-002 A1, UC-003 endpoint y A2, UC-005, UC-009 endpoint.
- `agent.py` al 17 %: falta simular OpenRouter y el RPC (TC-003).
- Sin pruebas Foundry de pausa ni de `setAgent` (UC-012, TC-004).
- Foundry: corregir la expectativa de `test_TC002` ("cause not verified" es el error correcto, UC-010 A3) y `test_GetRecipientCauses`.
- Skip intencional: firma de tx del agente (requiere fondos), requisitos HSK informativos, `verifyCause` on-chain.
