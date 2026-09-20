# El resumen de docs/IMPLEMENTATION-STATUS.md se genera de los documentos AIUP y debe estar al día

from scripts.aiup_summary import BEGIN, DOC, END, current_block, render


def test_status_summary_matches_the_aiup_documents():
    """Si falla: cd backend && python -m scripts.aiup_summary"""
    text = DOC.read_text()
    assert BEGIN in text and END in text
    assert current_block(text) == render(text)
