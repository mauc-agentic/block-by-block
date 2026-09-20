# Contrato único front/back: docs/api_contract.md debe reflejar la API real

from scripts.generate_api_contract import BEGIN, DOC, END, current_block, render


def test_contract_doc_matches_api():
    """Si falla: cd backend && python -m scripts.generate_api_contract (y revisar el cambio con el frontend)."""
    assert current_block(DOC.read_text()) == render()


def test_contract_doc_has_generated_markers():
    text = DOC.read_text()
    assert BEGIN in text and END in text


def test_amounts_are_documented_as_decimal_strings():
    assert "| `target_amount` | decimal (string) |" in DOC.read_text()
