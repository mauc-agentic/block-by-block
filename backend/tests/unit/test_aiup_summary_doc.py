# El resumen de docs/IMPLEMENTATION-STATUS.md se genera de los documentos AIUP y debe estar al día

from scripts.aiup_summary import BEGIN, DOC, END, current_block, render


def test_status_summary_matches_the_aiup_documents():
    """Si falla: cd backend && python -m scripts.aiup_summary"""
    text = DOC.read_text()
    assert BEGIN in text and END in text
    assert current_block(text) == render(text)


def test_use_case_audit_coverage_table_matches_the_tests():
    """Si falla: cd backend && python -m scripts.uc_coverage --write-doc"""
    from scripts import uc_coverage

    text = uc_coverage.AUDIT.read_text()
    assert uc_coverage.BEGIN in text and uc_coverage.END in text
    assert uc_coverage.current_block(text) == uc_coverage.render_markdown(uc_coverage.report())
