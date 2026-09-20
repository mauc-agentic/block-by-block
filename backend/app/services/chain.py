# chain.py
# Acceso de solo lectura a CauseVault en HSK (UC-006, UC-009, UC-011, UC-013, UC-014).
# El backend nunca firma transacciones de usuarios (C-009).

import json
from functools import lru_cache
from pathlib import Path
from typing import Optional

from web3 import Web3

from app.core import get_settings

settings = get_settings()

ABI_PATH = Path(__file__).resolve().parents[2] / "abi" / "CauseVault.json"

# Índices de la tupla que devuelve CauseVault.getCause
_STATUS_INDEX = 5
_COLLECTED_INDEX = 4
CAUSE_STATUS_COMPLETED = 3


def get_w3() -> Web3:
    return Web3(Web3.HTTPProvider(settings.hsk_rpc_url, request_kwargs={"timeout": 30}))


def vault_address() -> str:
    """Dirección de CauseVault en formato checksum (los clientes web3 estrictos lo exigen)."""
    return Web3.to_checksum_address(settings.cause_vault_address)


def get_contract(w3: Web3):
    abi = json.loads(ABI_PATH.read_text())
    return w3.eth.contract(address=w3.to_checksum_address(settings.cause_vault_address), abi=abi)


def _confirmed_receipt(w3: Web3, tx_hash: str):
    """Recibo de una tx exitosa, o None si no existe, no está confirmada o revirtió."""
    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
    except Exception:
        return None
    return receipt if receipt.status == 1 else None


def _vault_events(contract, receipt, event_name: str) -> list:
    """Eventos `event_name` emitidos por CauseVault; ignora logs de cualquier otro contrato."""
    event = getattr(contract.events, event_name)()
    decoded = []
    for log in receipt.logs:
        if log.address.lower() != contract.address.lower():
            continue
        try:
            decoded.append(event.process_log(log))
        except Exception:
            continue  # otro evento del mismo contrato
    return decoded


def read_cause_created(tx_hash: str) -> Optional[dict]:
    """UC-013: evento CauseCreated de la tx de `createCause`, o None (A3)."""
    w3 = get_w3()
    receipt = _confirmed_receipt(w3, tx_hash)
    if receipt is None:
        return None
    for event in _vault_events(get_contract(w3), receipt, "CauseCreated"):
        return {
            "cause_id": int(event.args.causeId),
            "recipient": event.args.recipient,
            "target_amount": int(event.args.targetAmount),
            "title": event.args.title,
        }
    return None


def read_donation_received(tx_hash: str) -> Optional[dict]:
    """UC-014: evento DonationReceived de la tx de `donate`, o None (A1/A4)."""
    w3 = get_w3()
    receipt = _confirmed_receipt(w3, tx_hash)
    if receipt is None:
        return None
    for event in _vault_events(get_contract(w3), receipt, "DonationReceived"):
        return {
            "cause_id": int(event.args.causeId),
            "donor": event.args.donor,
            "amount": int(event.args.amount),
        }
    return None


def read_cause_state(onchain_cause_id: int) -> Optional[dict]:
    """Estado y saldo retirable de una causa en el contrato; None si la red no responde."""
    try:
        data = get_contract(get_w3()).functions.getCause(onchain_cause_id).call()
        return {"status": int(data[_STATUS_INDEX]), "collected": int(data[_COLLECTED_INDEX])}
    except Exception:
        return None


@lru_cache()
def get_token_address() -> str:
    """Dirección del token ERC-20 que usa la bóveda (para la instrucción `approve`)."""
    return get_contract(get_w3()).functions.token().call()


LOG_CHUNK_BLOCKS = 100_000


def read_donation_logs(from_block: int, to_block: int) -> Optional[list[dict]]:
    """
    UC-016: eventos DonationReceived emitidos por CauseVault entre dos bloques (solo lectura).

    Devuelve None si la red no responde (UC-016 A3). Lee en tramos para respetar los límites del RPC.
    """
    try:
        w3 = get_w3()
        event = get_contract(w3).events.DonationReceived()
        found = []
        start = max(from_block, 0)
        while start <= to_block:
            end = min(start + LOG_CHUNK_BLOCKS - 1, to_block)
            for log in event.get_logs(from_block=start, to_block=end):
                found.append({
                    "tx_hash": w3.to_hex(log["transactionHash"]).lower(),
                    "cause_id": int(log["args"]["causeId"]),
                    "donor": log["args"]["donor"],
                    "amount": int(log["args"]["amount"]),
                    "block": int(log["blockNumber"]),
                })
            start = end + 1
        return found
    except Exception:
        return None
