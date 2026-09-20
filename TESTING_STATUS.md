# Testing Status — Block by Block

**Medido:** 2026-09-20 (`pytest --cov=app` en `backend/`, `forge test`/`forge coverage` en `contracts/`).
**Regla:** las pruebas de backend corren contra **Supabase real** (session pooler) y HSK testnet. No hay SQLite.
Requiere que tu IP esté en *Supabase → Settings → Database → Network Restrictions*.

## Resultados

| Suite                         | Resultado                       | Notas                                                                    |
|-------------------------------|---------------------------------|--------------------------------------------------------------------------|
| `backend/tests/unit`          | 39 pasan                        | Firma de wallet, conversiones, agente (IA simulada, reintentos, veredicto) |
| `backend/tests/integration`   | 42 pasan, 3 skip                | Supabase, ciclo de verificación (UC-005/006/013), HSK RPC/ABI            |
| **pytest total**              | **81 pasan, 3 skip, 0 fallan**  | Cobertura de líneas **71 %** (meta 85 %); `agent.py` 94 %, `causes.py` 94 % |
| `contracts/test` (Foundry)    | 7 pasan, **2 fallan**           | `test_TC002_RejectedCauseBlocksFunds`, `test_GetRecipientCauses`         |
| Cobertura del contrato        | 88.5 % líneas, 69.7 % ramas     | `forge coverage`                                                         |
| **E2E real** (`scripts/e2e_verification.py`) | OK                | Supabase + `createCause`/`verifyCause` en HSK testnet + OpenRouter real  |

## Cómo ejecutar

```bash
cd backend && source ../venv/bin/activate
pytest tests/ -v --cov=app --cov-report=term-missing        # ~3 min contra Supabase
python -m scripts.e2e_verification                          # gasta ~0.005 HSK y unos centavos de OpenRouter
cd ../contracts && forge test -vv && forge coverage --report summary
```

Las pruebas crean usuarios `e2e_*` en Supabase y los eliminan al terminar. El E2E deja causas permanentes en el contrato de testnet.

## Brechas de prueba (ver `docs/IMPLEMENTATION-STATUS.md`)

- Sin prueba: UC-001 A1/BR-002 (duplicados), UC-002 A1, UC-003 endpoint y A2, UC-009 endpoint, `chain.py` (42 %, lo cubre el E2E).
- Foundry: corregir `test_TC002` (el error correcto es "cause not verified", UC-010 A3) y `test_GetRecipientCauses`; faltan pruebas de pausa y `setAgent` (UC-012, TC-004).
- Skip intencional: firma de tx del agente y requisitos HSK informativos.
