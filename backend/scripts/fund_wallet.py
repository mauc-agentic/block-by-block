"""Fondea una wallet de prueba con MockUSDT (y opcionalmente HSK) desde la wallet del agente. SOLO testnet.

Uso (desde backend/):
    python -m scripts.fund_wallet --user carlos --usdt 100            # busca la wallet vinculada del usuario en Supabase
    python -m scripts.fund_wallet 0xDirección --usdt 50 --hsk 0.01    # dirección explícita
    python -m scripts.fund_wallet --user carlos --usdt 100 --dry-run  # muestra qué haría, sin enviar nada

El agente es dueño del suministro de MockUSDT y firma estas transferencias; no es una operación de usuario (C-009 no aplica:
es un faucet de pruebas). Se niega a operar fuera de HSK testnet (chain id 133) y por encima de los topes.
"""
import argparse
import sys
import time
from decimal import Decimal

from web3 import Web3

from app.core import get_settings

MAX_USDT = Decimal("1000")
MAX_HSK = Decimal("0.05")
EXPECTED_CHAIN_ID = 133
ERC20_ABI = [
    {"type": "function", "name": "transfer", "stateMutability": "nonpayable",
     "inputs": [{"name": "to", "type": "address"}, {"name": "value", "type": "uint256"}], "outputs": [{"type": "bool"}]},
    {"type": "function", "name": "balanceOf", "stateMutability": "view",
     "inputs": [{"name": "account", "type": "address"}], "outputs": [{"type": "uint256"}]},
]


def validate_amounts(usdt: Decimal, hsk: Decimal) -> None:
    if usdt < 0 or hsk < 0:
        raise ValueError("Los montos no pueden ser negativos")
    if usdt == 0 and hsk == 0:
        raise ValueError("Indica --usdt y/o --hsk")
    if usdt > MAX_USDT:
        raise ValueError(f"--usdt supera el tope de {MAX_USDT}")
    if hsk > MAX_HSK:
        raise ValueError(f"--hsk supera el tope de {MAX_HSK}")


def resolve_target(address: str | None, user: str | None, lookup=None) -> str:
    """Dirección destino: explícita o la wallet vinculada del usuario cuyo nombre contiene `user`."""
    if bool(address) == bool(user):
        raise ValueError("Indica una dirección o --user, pero no ambos")
    if address:
        if not Web3.is_address(address):
            raise ValueError(f"Dirección inválida: {address}")
        return Web3.to_checksum_address(address)
    matches = (lookup or _lookup_wallets)(user)
    if len(matches) != 1:
        raise ValueError(f"--user '{user}' coincide con {len(matches)} usuarios con wallet (se necesita exactamente 1): "
                         + ", ".join(f"{name} ({addr[:8]}…)" for name, addr in matches))
    return Web3.to_checksum_address(matches[0][1])


def _lookup_wallets(fragment: str) -> list[tuple[str, str]]:
    from sqlalchemy import create_engine, text
    engine = create_engine(get_settings().supabase_db_url)
    with engine.connect() as conn:
        rows = conn.execute(
            text("select username, wallet_address from users where wallet_address is not null and lower(username) like :q"),
            {"q": f"%{fragment.lower()}%"},
        ).fetchall()
    return [(r.username, r.wallet_address) for r in rows]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("address", nargs="?", help="Dirección destino (0x…)")
    parser.add_argument("--user", help="Fragmento del nombre de usuario con wallet vinculada")
    parser.add_argument("--usdt", type=Decimal, default=Decimal("0"), help=f"MockUSDT a enviar (máx {MAX_USDT})")
    parser.add_argument("--hsk", type=Decimal, default=Decimal("0"), help=f"HSK para gas a enviar (máx {MAX_HSK})")
    parser.add_argument("--dry-run", action="store_true", help="No envía nada")
    args = parser.parse_args(argv)

    try:
        validate_amounts(args.usdt, args.hsk)
        target = resolve_target(args.address, args.user)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2

    from app.services.chain import get_token_address, get_w3
    settings = get_settings()
    w3 = get_w3()
    if not w3.is_connected() or w3.eth.chain_id != EXPECTED_CHAIN_ID:
        print(f"Error: se esperaba HSK testnet (chain id {EXPECTED_CHAIN_ID}); este script no opera en otra red", file=sys.stderr)
        return 2
    agent = w3.eth.account.from_key(settings.agent_private_key)
    if agent.address.lower() != settings.agent_address.lower():
        print("Error: AGENT_PRIVATE_KEY no corresponde a AGENT_ADDRESS", file=sys.stderr)
        return 2
    token = w3.eth.contract(address=w3.to_checksum_address(get_token_address()), abi=ERC20_ABI)

    def balances(addr):
        return w3.from_wei(w3.eth.get_balance(addr), "ether"), Decimal(token.functions.balanceOf(addr).call()) / 10**6

    hsk0, usdt0 = balances(target)
    a_hsk, a_usdt = balances(agent.address)
    print(f"Destino  {target}  HSK={hsk0}  MockUSDT={usdt0}")
    print(f"Agente   {agent.address}  HSK={a_hsk}  MockUSDT={a_usdt}")
    if args.usdt > a_usdt or (args.hsk and args.hsk >= a_hsk):
        print("Error: el agente no tiene saldo suficiente", file=sys.stderr)
        return 2
    print(f"Enviaré: {args.usdt} MockUSDT y {args.hsk} HSK" + ("  (dry-run: no se envía nada)" if args.dry_run else ""))
    if args.dry_run:
        return 0

    def send(tx: dict) -> str:
        tx.update({"from": agent.address, "nonce": w3.eth.get_transaction_count(agent.address, "pending"),
                   "gasPrice": w3.eth.gas_price, "chainId": EXPECTED_CHAIN_ID})
        signed = w3.eth.account.sign_transaction(tx, settings.agent_private_key)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        if w3.eth.wait_for_transaction_receipt(tx_hash, timeout=90).status != 1:
            raise RuntimeError(f"La transacción revirtió: {w3.to_hex(tx_hash)}")
        return w3.to_hex(tx_hash)

    if args.usdt:
        tx = token.functions.transfer(target, int(args.usdt * 10**6)).build_transaction(
            {"from": agent.address, "gas": 100000, "nonce": 0, "gasPrice": 0, "chainId": EXPECTED_CHAIN_ID})
        print("MockUSDT enviado, tx:", send(tx))
    if args.hsk:
        print("HSK enviado, tx:", send({"to": target, "value": w3.to_wei(args.hsk, "ether"), "gas": 21000}))

    for _ in range(15):  # el RPC balancea entre nodos con desfase: se espera a que el saldo se refleje
        hsk1, usdt1 = balances(target)
        if usdt1 - usdt0 >= args.usdt and hsk1 - hsk0 >= Decimal(str(args.hsk)) - Decimal("0.000001"):
            break
        time.sleep(2)
    print(f"Destino ahora  HSK={hsk1}  MockUSDT={usdt1}")
    print("Explorador: https://testnet-explorer.hskchain.net/address/" + target)
    return 0


if __name__ == "__main__":
    sys.exit(main())
