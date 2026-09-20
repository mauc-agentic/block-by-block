"""Prueba real de punta a punta (UC-004/005/006/013): Supabase + HSK testnet + OpenRouter.

Usa la wallet del agente como wallet del receptor (solo para esta prueba) y limpia la BD al terminar.
Uso: cd backend && python -m scripts.e2e_verification
"""
import asyncio
import struct
import uuid
import zlib

from eth_account import Account
from eth_account.messages import encode_defunct
from fastapi.testclient import TestClient

import app.api.v1.endpoints.causes as causes_ep
from app.core import get_settings
from app.db import SessionLocal
from app.db.models import Cause, Evidence, User, Verification
from app.main import app
from app.services import agent
from app.services.chain import get_contract, get_w3

s = get_settings()
w3, vault = get_w3(), None
vault = get_contract(w3)
wallet = Account.from_key(s.agent_private_key)
causes_ep.enqueue_verification = lambda cause_id: None  # se ejecuta la tarea de forma explícita


def png(w=96, h=96, rgb=(120, 120, 120)):
    raw = b"".join(b"\x00" + bytes(rgb) * w for _ in range(h))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def send_create_cause(params):
    tx = vault.functions.createCause(*params).build_transaction({
        "from": wallet.address, "nonce": w3.eth.get_transaction_count(wallet.address),
        "gasPrice": w3.eth.gas_price, "gas": 400000, "chainId": s.hsk_chain_id})
    signed = w3.eth.account.sign_transaction(tx, s.agent_private_key)
    h = w3.eth.send_raw_transaction(signed.raw_transaction)
    assert w3.eth.wait_for_transaction_receipt(h, timeout=90).status == 1
    return w3.to_hex(h)


def new_published_cause(client, headers, title):
    cause = client.post("/api/v1/causes", headers=headers, json={
        "title": title, "description": "Se dañó el techo de mi vivienda por las lluvias y necesito repararlo",
        "target_amount": 12.5}).json()
    inst = client.post(f"/api/v1/causes/{cause['id']}/publish", headers=headers).json()
    tx = send_create_cause(inst["params"])
    linked = client.post(f"/api/v1/causes/{cause['id']}/publish/confirm", headers=headers, json={"tx_hash": tx})
    assert linked.status_code == 200, linked.text
    return cause["id"], linked.json()["onchain_cause_id"], tx


def onchain(onchain_id):
    c = vault.functions.getCause(onchain_id).call()
    return {"verified": c[7] if len(c) > 7 else None, "raw": c}


tag = uuid.uuid4().hex[:8]
client = TestClient(app)
signup = client.post("/api/v1/auth/signup", json={"username": f"e2e_real_{tag}", "email": f"e2e_real_{tag}@block-by-block.com",
                                                   "password": "Pass123!", "user_type": "recipient"}).json()
headers, user_id = {"Authorization": f"Bearer {signup['access_token']}"}, signup["user"]["id"]
db = SessionLocal()
try:
    msg = f"Link wallet {tag}"
    sig = wallet.sign_message(encode_defunct(text=msg)).signature.hex()
    r = client.post("/api/v1/auth/wallet/link", headers=headers, json={
        "wallet_address": wallet.address, "signature": "0x" + sig.removeprefix("0x"), "message": msg})
    assert r.status_code == 200, r.text
    print("1. wallet vinculada:", wallet.address)

    # Escenario A: IA real sobre una imagen sintética (se espera rechazo, registrado on-chain)
    cid, oid, tx = new_published_cause(client, headers, f"E2E real A {tag}")
    print(f"2. causa {cid} publicada on-chain id={oid} tx={tx}")
    up = client.post(f"/api/v1/causes/{cid}/upload-image", headers=headers, files={"image": ("gris.png", png(), "image/png")})
    print("3. evidencia:", up.json())
    asyncio.run(agent.verify_cause_task(cid))
    db.expire_all()
    c = db.query(Cause).filter(Cause.id == cid).one()
    v = db.query(Verification).filter(Verification.cause_id == cid).one()
    print(f"4. IA real -> verified={v.verified} confianza={v.confidence} motivo={v.reason!r}")
    print(f"   estado BD={c.status} tx verifyCause={v.tx_hash}")
    chain_status = vault.functions.getCause(oid).call()
    print("   estado on-chain (getCause):", chain_status)
    assert c.status == "Rejected" and v.tx_hash, "esperaba Rejected confirmado on-chain"

    # Escenario B: veredicto positivo simulado, cadena real (prueba el camino Verified de extremo a extremo)
    cid2, oid2, tx2 = new_published_cause(client, headers, f"E2E real B {tag}")
    client.post(f"/api/v1/causes/{cid2}/upload-image", headers=headers, files={"image": ("gris.png", png(rgb=(90, 80, 70)), "image/png")})

    async def positive(image, ctype, description):
        return {"verified": True, "confidence": 0.93, "reason": "veredicto simulado para la prueba"}
    real_ai, agent.verify_cause_with_ai = agent.verify_cause_with_ai, positive
    asyncio.run(agent.verify_cause_task(cid2))
    agent.verify_cause_with_ai = real_ai
    db.expire_all()
    c2 = db.query(Cause).filter(Cause.id == cid2).one()
    print(f"5. veredicto positivo -> estado BD={c2.status} tx={c2.verification.tx_hash}")
    print("   estado on-chain (getCause):", vault.functions.getCause(oid2).call())
    listed = [x["id"] for x in client.get("/api/v1/causes").json()]
    assert c2.status == "Verified" and cid2 in listed and cid not in listed
    print("6. GET /causes lista la causa Verified y no la Rejected  OK")
    ev = client.get(f"/api/v1/causes/{cid2}/evidence")
    print("7. GET evidence:", ev.status_code, ev.headers.get("content-type"), len(ev.content), "bytes")
    print("\nE2E REAL OK")
finally:
    db.rollback()
    ids = [c.id for c in db.query(Cause).filter(Cause.recipient_id == user_id)]
    if ids:
        db.query(Verification).filter(Verification.cause_id.in_(ids)).delete(synchronize_session=False)
        db.query(Evidence).filter(Evidence.cause_id.in_(ids)).delete(synchronize_session=False)
        db.query(Cause).filter(Cause.id.in_(ids)).delete(synchronize_session=False)
    db.query(User).filter(User.id == user_id).delete()
    db.commit()
    db.close()
