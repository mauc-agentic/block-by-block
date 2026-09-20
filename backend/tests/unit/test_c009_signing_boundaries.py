# C-009 y UC-006 BR-003: el backend solo firma con la llave del agente y nunca la registra (análisis estático, sin red)

import re
from pathlib import Path

APP = Path(__file__).resolve().parents[2] / "app"
SOURCES = {p: p.read_text() for p in APP.rglob("*.py")}


def test_uc009_br004_uc013_br001_uc014_br003_uc010_br005_only_the_agent_module_signs_transactions():
    """C-009: ningún endpoint firma ni envía transacciones; solo services/agent.py con la llave del agente."""
    offenders = [str(p.relative_to(APP)) for p, text in SOURCES.items()
                 if re.search(r"sign_transaction|send_raw_transaction|send_transaction", text)
                 and p.relative_to(APP).as_posix() != "services/agent.py"]
    assert offenders == [], f"módulos que firman o envían transacciones fuera del agente: {offenders}"


def test_uc006_br003_agent_private_key_value_is_never_logged_or_returned():
    """Un log puede nombrar la variable, pero nunca interpolar ni devolver su valor."""
    for path, text in SOURCES.items():
        for number, line in enumerate(text.splitlines(), 1):
            if re.search(r"settings\.agent_private_key|private_key\}", line):
                assert not re.search(r"logger\.|print\(|HTTPException|return ", line), f"{path.name}:{number} expone la llave: {line.strip()}"


def test_uc006_br003_agent_private_key_is_only_read_by_the_signing_module():
    readers = [p.relative_to(APP).as_posix() for p, text in SOURCES.items() if "agent_private_key" in text]
    assert set(readers) <= {"services/agent.py", "core/config.py"}, readers
