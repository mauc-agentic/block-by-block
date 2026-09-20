# chain.py
# Acceso de solo lectura a CauseVault en HSK y utilidades de firma del agente (UC-006, UC-013)

import json
from pathlib import Path
from typing import Optional

from web3 import Web3

from app.core import get_settings

settings = get_settings()

ABI_PATH = Path(__file__).resolve().parents[2] / "abi" / "CauseVault.json"


def get_w3() -> Web3:
    return Web3(Web3.HTTPProvider(settings.hsk_rpc_url, request_kwargs={"timeout": 30}))


def get_contract(w3: Web3):
    abi = json.loads(ABI_PATH.read_text())
    return w3.eth.contract(address=w3.to_checksum_address(settings.cause_vault_address), abi=abi)


def read_cause_created(tx_hash: str) -> Optional[dict]:
    """
    UC-013: Lee la tx de `createCause` y devuelve el evento CauseCreated.

    Devuelve None si la tx no existe, no está confirmada, revirtió o no emitió el evento
    (UC-013 A3). El backend nunca firma: solo consulta la red (C-009).
    """
    w3 = get_w3()
    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
    except Exception:
        return None
    if receipt.status != 1:
        return None

    contract = get_contract(w3)
    for event in contract.events.CauseCreated().process_receipt(receipt):
        return {
            "cause_id": int(event.args.causeId),
            "recipient": event.args.recipient,
            "target_amount": int(event.args.targetAmount),
            "title": event.args.title,
        }
    return None
