"""Dona MockUSDT a una causa Verified firmando en la cadena con la wallet local del agente. SOLO demostración en testnet.

Mientras la interfaz no tenga la pantalla de donar (UC-009), esto ejecuta `approve` + `donate` desde la wallet configurada en
AGENT_PRIVATE_KEY (en este proyecto es también la wallet vinculada de Miguel). Luego la donación se registra en la plataforma con el
endpoint `POST /causes/{id}/donations/confirm` usando la SESIÓN del usuario (el script imprime el fragmento para la consola del
navegador); no genera ni usa tokens de sesión ajenos.

Uso (desde backend/):
    python -m scripts.donate --cause 352 --amount 10 --dry-run     # muestra qué haría
    python -m scripts.donate --cause 352 --amount 10
"""
import argparse
import sys
from decimal import Decimal

from app.core import get_settings

MAX_USDT = Decimal("100")
EXPECTED_CHAIN_ID = 133
ERC20_ABI = [
    {"type": "function", "name": "approve", "stateMutability": "nonpayable",
     "inputs": [{"name": "spender", "type": "address"}, {"name": "value", "type": "uint256"}], "outputs": [{"type": "bool"}]},
    {"type": "function", "name": "allowance", "stateMutability": "view",
     "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}], "outputs": [{"type": "uint256"}]},
    {"type": "function", "name": "balanceOf", "stateMutability": "view",
     "inputs": [{"name": "account", "type": "address"}], "outputs": [{"type": "uint256"}]},
]


def validate_amount(amount: Decimal) -> None:
    if amount <= 0:
        raise ValueError("--amount debe ser mayor que 0")
    if amount > MAX_USDT:
        raise ValueError(f"--amount supera el tope de {MAX_USDT} USDT")
    if amount.as_tuple().exponent < -6:
        raise ValueError("USDT admite como máximo 6 decimales")


def validate_cause(status: str, onchain_id, recipient_wallet: str | None, donor_wallet: str) -> None:
    """Reglas de UC-009: solo causas Verified y publicadas; donar a una causa propia no tiene sentido."""
    if status != "Verified":
        raise ValueError(f"La causa está {status}; solo se dona a causas Verified")
    if onchain_id is None:
        raise ValueError("La causa no está publicada en el contrato")
    if recipient_wallet and recipient_wallet.lower() == donor_wallet.lower():
        raise ValueError("La wallet donante es la misma del receptor de la causa")


def console_snippet(api_base: str, cause_id: int, tx_hash: str) -> str:
    return (f'fetch("{api_base}/causes/{cause_id}/donations/confirm", {{method:"POST", headers:{{"Content-Type":"application/json", '
            f'Authorization:"Bearer "+localStorage.getItem("bbb_token")}}, body:JSON.stringify({{tx_hash:"{tx_hash}"}})}})'
            f'.then(r=>r.json()).then(console.log)')


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--cause", type=int, required=True, help="Id de la causa en la plataforma")
    parser.add_argument("--amount", type=Decimal, required=True, help=f"USDT a donar (máx {MAX_USDT})")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--api", default="https://blockbyblock-8wk2.onrender.com/api/v1", help="Base de la API para el fragmento de confirmación")
    args = parser.parse_args(argv)
    try:
        validate_amount(args.amount)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2

    from sqlalchemy import create_engine, text
    from app.services.chain import get_contract, get_token_address, get_w3
    settings = get_settings()
    w3 = get_w3()
    if not w3.is_connected() or w3.eth.chain_id != EXPECTED_CHAIN_ID:
        print(f"Error: se esperaba HSK testnet (chain id {EXPECTED_CHAIN_ID})", file=sys.stderr)
        return 2
    account = w3.eth.account.from_key(settings.agent_private_key)
    if account.address.lower() != settings.agent_address.lower():
        print("Error: AGENT_PRIVATE_KEY no corresponde a AGENT_ADDRESS", file=sys.stderr)
        return 2

    with create_engine(settings.supabase_db_url).connect() as conn:
        row = conn.execute(text(
            "select c.title, c.status, c.onchain_cause_id, u.wallet_address recipient_wallet, d.username donor_user "
            "from causes c join users u on u.id = c.recipient_id "
            "left join users d on lower(d.wallet_address) = lower(:w) where c.id = :i"), {"i": args.cause, "w": account.address}).first()
    if row is None:
        print(f"Error: no existe la causa {args.cause}", file=sys.stderr)
        return 2
    try:
        validate_cause(row.status, row.onchain_cause_id, row.recipient_wallet, account.address)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2

    vault = get_contract(w3)
    token = w3.eth.contract(address=w3.to_checksum_address(get_token_address()), abi=ERC20_ABI)
    amount_wei = int(args.amount * 10**6)
    balance = token.functions.balanceOf(account.address).call()
    print(f"Causa {args.cause} «{row.title}» (id on-chain {row.onchain_cause_id}, {row.status})")
    print(f"Donante  {account.address}" + (f"  (cuenta de la plataforma: {row.donor_user})" if row.donor_user else "  (sin cuenta vinculada: no podrá registrarse)"))
    print(f"Monto    {args.amount} MockUSDT   saldo del donante: {Decimal(balance) / 10**6}")
    if amount_wei > balance:
        print("Error: saldo insuficiente", file=sys.stderr)
        return 2
    if args.dry_run:
        print("dry-run: no se envió nada")
        return 0

    def send(tx: dict) -> str:
        tx.update({"from": account.address, "nonce": w3.eth.get_transaction_count(account.address, "pending"),
                   "gasPrice": w3.eth.gas_price, "chainId": EXPECTED_CHAIN_ID, "gas": 300000})
        signed = w3.eth.account.sign_transaction(tx, settings.agent_private_key)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        if w3.eth.wait_for_transaction_receipt(tx_hash, timeout=90).status != 1:
            raise RuntimeError(f"La transacción revirtió: {w3.to_hex(tx_hash)}")
        return w3.to_hex(tx_hash)

    print("approve:", send(token.functions.approve(vault.address, amount_wei).build_transaction({"from": account.address, "nonce": 0, "gasPrice": 0})))
    donate_tx = send(vault.functions.donate(row.onchain_cause_id, amount_wei).build_transaction({"from": account.address, "nonce": 0, "gasPrice": 0}))
    print("donate: ", donate_tx)
    print("\nDonación firmada y confirmada en la cadena. Para registrarla en la plataforma, con tu sesión abierta en la web,")
    print("pega esto en la consola del navegador:\n")
    print(console_snippet(args.api, args.cause, donate_tx))
    return 0


if __name__ == "__main__":
    sys.exit(main())
