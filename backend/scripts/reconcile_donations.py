"""Reconcilia las donaciones del contrato con la plataforma (UC-016). Solo lectura sobre la red.

Uso (desde backend/):
    python -m scripts.reconcile_donations --dry-run      # muestra qué registraría, sin escribir
    python -m scripts.reconcile_donations                # registra las que faltan
    python -m scripts.reconcile_donations --from-block 33347175
"""
import argparse
import sys

from sqlalchemy import func

from app.core import get_settings
from app.db import SessionLocal
from app.db.models import Cause, Donation, User
from app.services import chain, reconcile


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--from-block", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)
    settings = get_settings()
    db = SessionLocal()
    try:
        if args.dry_run:
            latest = chain.get_w3().eth.block_number
            start = args.from_block if args.from_block is not None else max(settings.cause_vault_start_block, latest - reconcile.MAX_LOOKBACK_BLOCKS, 0)
            events = chain.read_donation_logs(start, latest)
            if events is None:
                print("No se pudieron leer los eventos del contrato", file=sys.stderr)
                return 2
            print(f"Eventos DonationReceived en los bloques {start}..{latest}: {len(events)}")
            for e in events:
                known = db.query(Donation).filter(Donation.tx_hash == e["tx_hash"]).first() is not None
                cause = db.query(Cause).filter(Cause.onchain_cause_id == e["cause_id"]).first()
                user = db.query(User).filter(func.lower(User.wallet_address) == e["donor"].lower()).first()
                verdict = "ya registrada" if known else ("SE REGISTRARÍA" if cause and user else "se omite (sin " + ("causa" if not cause else "cuenta") + ")")
                print(f"  {e['tx_hash'][:14]}… causa on-chain {e['cause_id']} {e['amount'] / 1e6:g} USDT  {verdict}")
            return 0
        created = reconcile.reconcile_donations(db, args.from_block)
        print(f"Donaciones registradas: {len(created)} {created}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
