"""Prueba real de punta a punta de donar y retirar (UC-009/010/011/014): Supabase + HSK testnet.

Publica y verifica una causa (veredicto de IA simulado, cadena real), fondea una wallet de donante nueva desde
la wallet del agente, dona con `approve` + `donate` firmados por el donante, registra la donación, consulta los
dashboards y retira con el receptor. Limpia la BD al terminar.
Uso: cd backend && python -m scripts.e2e_donation
"""
import asyncio
import struct
import time
import uuid
import zlib
from decimal import Decimal

from eth_account import Account
from eth_account.messages import encode_defunct
from fastapi.testclient import TestClient

import app.api.v1.endpoints.causes as causes_ep
from app.core import get_settings
from app.db import SessionLocal
from app.db.models import Cause, Donation, Evidence, User, Verification
from app.main import app
from app.services import agent
from app.services.chain import get_contract, get_w3

s = get_settings()
w3 = get_w3()
vault = get_contract(w3)
agent_acct = Account.from_key(s.agent_private_key)
TOKEN = vault.functions.token().call()
ERC20 = [
    {"type": "function", "name": "transfer", "stateMutability": "nonpayable", "inputs": [{"name": "to", "type": "address"}, {"name": "v", "type": "uint256"}], "outputs": [{"type": "bool"}]},
    {"type": "function", "name": "approve", "stateMutability": "nonpayable", "inputs": [{"name": "s", "type": "address"}, {"name": "v", "type": "uint256"}], "outputs": [{"type": "bool"}]},
    {"type": "function", "name": "balanceOf", "stateMutability": "view", "inputs": [{"name": "a", "type": "address"}], "outputs": [{"type": "uint256"}]},
]
token = w3.eth.contract(address=w3.to_checksum_address(TOKEN), abi=ERC20)
causes_ep.enqueue_verification = lambda cause_id: None


def png(w=96, h=96, rgb=(120, 120, 120)):
    raw = b"".join(b"\x00" + bytes(rgb) * w for _ in range(h))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def send(acct, tx):
    tx.update({"from": acct.address, "nonce": w3.eth.get_transaction_count(acct.address, "pending"),
               "gasPrice": w3.eth.gas_price, "chainId": s.hsk_chain_id})
    tx.setdefault("gas", 300000)
    signed = w3.eth.account.sign_transaction(tx, acct.key)
    h = w3.eth.send_raw_transaction(signed.raw_transaction)
    assert w3.eth.wait_for_transaction_receipt(h, timeout=90).status == 1, "tx revirtió"
    return w3.to_hex(h)


def call(acct, contract, function, params):
    return send(acct, getattr(contract.functions, function)(*params).build_transaction({"from": acct.address, "gas": 300000,
        "nonce": w3.eth.get_transaction_count(acct.address, "pending"), "gasPrice": w3.eth.gas_price, "chainId": s.hsk_chain_id}))


def signup(client, role, tag):
    r = client.post("/api/v1/auth/signup", json={"username": f"e2e_don_{role}_{tag}", "email": f"e2e_don_{role}_{tag}@block-by-block.com",
                                                  "password": "Pass123!", "user_type": role}).json()
    return {"Authorization": f"Bearer {r['access_token']}"}, r["user"]["id"]


def link(client, headers, acct, tag):
    msg = f"Link wallet {tag}"
    sig = acct.sign_message(encode_defunct(text=msg)).signature.hex()
    r = client.post("/api/v1/auth/wallet/link", headers=headers, json={"wallet_address": acct.address, "signature": "0x" + sig.removeprefix("0x"), "message": msg})
    assert r.status_code == 200, r.text


tag = uuid.uuid4().hex[:8]
client = TestClient(app)
donor_acct = Account.create()
db = SessionLocal()
user_ids = []
try:
    r_headers, r_id = signup(client, "recipient", tag); user_ids.append(r_id)
    link(client, r_headers, agent_acct, f"r{tag}")
    cause = client.post("/api/v1/causes", headers=r_headers, json={
        "title": f"E2E donación {tag}", "description": "Se dañó el techo de mi vivienda por las lluvias y necesito repararlo", "target_amount": 3}).json()
    inst = client.post(f"/api/v1/causes/{cause['id']}/publish", headers=r_headers).json()
    tx = send(agent_acct, vault.functions.createCause(*inst["params"]).build_transaction({"from": agent_acct.address, "gas": 400000,
        "nonce": w3.eth.get_transaction_count(agent_acct.address, "pending"), "gasPrice": w3.eth.gas_price, "chainId": s.hsk_chain_id}))
    linked = client.post(f"/api/v1/causes/{cause['id']}/publish/confirm", headers=r_headers, json={"tx_hash": tx}).json()
    onchain = linked["onchain_cause_id"]
    client.post(f"/api/v1/causes/{cause['id']}/upload-image", headers=r_headers, files={"image": ("a.png", png(), "image/png")})

    async def positive(image, ctype, description):
        return {"verified": True, "confidence": 0.95, "reason": "veredicto simulado para la prueba"}
    real_ai, agent.verify_cause_with_ai = agent.verify_cause_with_ai, positive
    asyncio.run(agent.verify_cause_task(cause["id"]))
    agent.verify_cause_with_ai = real_ai
    print(f"1. causa {cause['id']} on-chain id={onchain} verificada:", client.get(f"/api/v1/causes/{cause['id']}").json()["status"])

    # Donante: wallet nueva fondeada por el agente
    send(agent_acct, {"to": donor_acct.address, "value": w3.to_wei(0.01, "ether"), "gas": 21000})
    call(agent_acct, token, "transfer", [donor_acct.address, 5_000_000])
    d_headers, d_id = signup(client, "donor", tag); user_ids.append(d_id)
    link(client, d_headers, donor_acct, f"d{tag}")
    print("2. donante", donor_acct.address, "fondeado con USDT:", token.functions.balanceOf(donor_acct.address).call() / 1e6)

    inst = client.post(f"/api/v1/causes/{cause['id']}/donate", headers=d_headers, json={"amount": 3}).json()
    assert inst["params"][0] == onchain and inst["approve"]["contract"].lower() == TOKEN.lower(), inst
    call(donor_acct, token, "approve", inst["approve"]["params"])
    donate_tx = call(donor_acct, vault, "donate", inst["params"])
    print("3. approve + donate firmados por el donante, tx:", donate_tx)

    rec = client.post(f"/api/v1/causes/{cause['id']}/donations/confirm", headers=d_headers, json={"tx_hash": donate_tx})
    print("4. registro de la donación:", rec.status_code, rec.json())
    assert rec.status_code == 200 and rec.json()["cause_status"] == "Completed"
    again = client.post(f"/api/v1/causes/{cause['id']}/donations/confirm", headers=d_headers, json={"tx_hash": donate_tx})
    assert again.json()["id"] == rec.json()["id"], "A2 idempotencia"

    detail = client.get(f"/api/v1/causes/{cause['id']}").json()
    print("5. detalle: recaudado", detail["collected"], "donaciones", len(detail["donations"]), "estado", detail["status"])
    assert Decimal(detail["collected"]) == 3 and len(detail["donations"]) == 1

    d_dash = client.get(f"/api/v1/users/{d_id}", headers=d_headers).json()
    r_dash = client.get(f"/api/v1/users/{r_id}", headers=r_headers).json()
    print("6. dashboard donante: total donado", d_dash["donor"]["total_donated"])
    print("   dashboard receptor:", r_dash["recipient"]["causes"])
    assert Decimal(r_dash["recipient"]["causes"][0]["available_to_withdraw"]) == 3

    before = token.functions.balanceOf(agent_acct.address).call()
    wtx = call(agent_acct, vault, "withdrawFunds", [onchain])
    for _ in range(15):  # el RPC balancea entre nodos con desfase: se espera a que el saldo se refleje
        after = token.functions.balanceOf(agent_acct.address).call()
        if after - before == 3_000_000:
            break
        time.sleep(2)
    r_dash = client.get(f"/api/v1/users/{r_id}", headers=r_headers).json()
    print(f"7. retiro tx {wtx}: saldo del receptor +{(after - before) / 1e6} USDT; disponible ahora", r_dash["recipient"]["causes"][0]["available_to_withdraw"])
    assert after - before == 3_000_000 and Decimal(r_dash["recipient"]["causes"][0]["available_to_withdraw"]) == 0
    print("\nE2E DONACIÓN REAL OK")
finally:
    db.rollback()
    ids = [c.id for c in db.query(Cause).filter(Cause.recipient_id.in_(user_ids))]
    db.query(Donation).filter((Donation.donor_id.in_(user_ids)) | (Donation.cause_id.in_(ids))).delete(synchronize_session=False)
    if ids:
        db.query(Verification).filter(Verification.cause_id.in_(ids)).delete(synchronize_session=False)
        db.query(Evidence).filter(Evidence.cause_id.in_(ids)).delete(synchronize_session=False)
        db.query(Cause).filter(Cause.id.in_(ids)).delete(synchronize_session=False)
    db.query(User).filter(User.id.in_(user_ids)).delete(synchronize_session=False)
    db.commit(); db.close()
