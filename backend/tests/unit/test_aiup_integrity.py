# Integridad de la documentación AIUP: IDs, estados y trazabilidad coherentes entre archivos (sin red)

import re
from pathlib import Path

import pytest

DOCS = Path(__file__).resolve().parents[3] / "docs"
ROOT = DOCS.parent
UC_FILES = sorted((DOCS / "use_cases").glob("UC-*.md"))
TC_FILES = sorted((DOCS / "test_cases").glob("TC-*.md"))
STATUS = (DOCS / "IMPLEMENTATION-STATUS.md").read_text()
REQUIREMENTS = (DOCS / "requirements.md").read_text()
TRACE = (DOCS / "traceability.md").read_text()

UC_STATUSES = {"Draft", "Reviewed", "Approved", "Implemented", "Tested", "Done"}
FR_STATUSES = {"Open", "In Progress", "Implemented", "Verified", "Deferred"}
GAP_STATES = {"Crítica", "Alta", "Media", "Baja", "Resuelta"}


def uc_id(path: Path) -> str:
    return re.match(r"(UC-\d{3})", path.name).group(1)


def requirement_ids() -> set[str]:
    return set(re.findall(r"^\| ((?:FR|NFR|C)-\d{3}) ", REQUIREMENTS, re.M))


def gap_rows() -> list[tuple[str, str]]:
    return re.findall(r"^\| (GAP-\d{3}) \| ([^|]+?) +\|", STATUS, re.M)


def all_doc_text() -> str:
    parts = [p.read_text() for p in (DOCS.rglob("*.md"))] + [(ROOT / "CLAUDE.md").read_text()]
    return "\n".join(parts)


def test_uc_files_have_valid_status_and_unique_ids():
    ids = [uc_id(p) for p in UC_FILES]
    assert len(ids) == len(set(ids)) and len(ids) >= 14
    for path in UC_FILES:
        status = re.search(r"\*\*Status:\*\* (\w+)", path.read_text()).group(1)
        assert status in UC_STATUSES, f"{path.name}: estado inválido {status}"


def test_requirement_statuses_use_the_shared_vocabulary():
    for row in re.findall(r"^\| (?:FR|NFR|C)-\d{3} .*\|\s*([A-Za-z ]+?)\s*\|$", REQUIREMENTS, re.M):
        assert row in FR_STATUSES, f"estado de requisito inválido: {row}"


def test_requirement_ids_are_unique():
    ids = re.findall(r"^\| ((?:FR|NFR|C)-\d{3}) ", REQUIREMENTS, re.M)
    assert len(ids) == len(set(ids))


@pytest.mark.parametrize("path", UC_FILES, ids=lambda p: p.name[:6])
def test_uc_requirements_exist_in_the_catalog(path):
    line = re.search(r"\*\*Requirements:\*\* (.*)", path.read_text()).group(1)
    referenced = set(re.findall(r"(?:FR|NFR|C)-\d{3}", line))
    assert referenced, f"{path.name} no enlaza ningún requisito"
    assert referenced <= requirement_ids(), f"{path.name}: requisitos inexistentes {referenced - requirement_ids()}"


def test_every_functional_requirement_is_realized_by_some_use_case():
    realized = set(re.findall(r"FR-\d{3}", "\n".join(re.search(r"\*\*Requirements:\*\* (.*)", p.read_text()).group(1) for p in UC_FILES)))
    deferred = set(re.findall(r"^\| (FR-\d{3}) .*\| Deferred +\|$", REQUIREMENTS, re.M))
    missing = {fr for fr in requirement_ids() if fr.startswith("FR-")} - realized - deferred
    assert not missing, f"FR sin caso de uso (y no diferidos): {sorted(missing)}"


def test_traceability_lists_every_use_case_and_only_real_ones():
    listed = set(re.findall(r"^\| (UC-\d{3}) \|", TRACE, re.M))
    assert listed == {uc_id(p) for p in UC_FILES}


def test_test_cases_reference_existing_use_cases():
    existing = {uc_id(p) for p in UC_FILES}
    for path in TC_FILES:
        assert set(re.findall(r"UC-\d{3}", path.read_text())) <= existing, path.name


def test_gap_register_ids_are_unique_and_states_valid():
    rows = gap_rows()
    ids = [g for g, _ in rows]
    assert len(ids) == len(set(ids)) and len(ids) > 20
    assert {s for _, s in rows} <= GAP_STATES, {s for _, s in rows} - GAP_STATES


def test_every_gap_mentioned_anywhere_exists_in_the_register():
    registered = {g for g, _ in gap_rows()}
    mentioned = set(re.findall(r"GAP-\d{3}", all_doc_text()))
    assert mentioned <= registered, f"GAP citados sin registrar: {sorted(mentioned - registered)}"


def test_plantuml_diagram_lists_every_use_case():
    puml = (DOCS / "use_cases.puml").read_text()
    assert {uc_id(p) for p in UC_FILES} <= set(re.findall(r"UC-\d{3}", puml))


def test_claude_md_map_covers_every_use_case():
    mapped = set(re.findall(r"^\| (UC-\d{3}) \|", (ROOT / "CLAUDE.md").read_text(), re.M))
    assert {uc_id(p) for p in UC_FILES} <= mapped


# ---- frontend_spec.md: la especificación del frontend habla el mismo idioma que el resto de la documentación

FRONT = (DOCS / "frontend_spec.md").read_text()
CONTRACT = (DOCS / "api_contract.md").read_text()


def _normalize(path: str) -> str:
    return re.sub(r"\{[^}]+\}", "{}", path.replace("/api/v1", ""))


def test_frontend_spec_only_cites_endpoints_that_exist_in_the_api_contract():
    real = {(m, _normalize(p)) for m, p in re.findall(r"^\| (GET|POST|PUT|PATCH|DELETE) \| `([^`]+)` \|", CONTRACT, re.M)}
    cited = {(m, _normalize(p)) for m, p in re.findall(r"`(GET|POST|PUT|PATCH|DELETE) (/[^`\s]+)`", FRONT)}
    assert cited, "la spec no cita ningún endpoint"
    assert cited <= real, f"endpoints citados que no existen: {sorted(cited - real)}"


def test_frontend_spec_references_existing_use_cases_requirements_and_gaps():
    assert set(re.findall(r"UC-\d{3}", FRONT)) <= {uc_id(p) for p in UC_FILES}
    assert set(re.findall(r"\b(?:FR|NFR)-\d{3}", FRONT)) <= requirement_ids()
    assert set(re.findall(r"GAP-\d{3}", FRONT)) <= {g for g, _ in gap_rows()}


def test_every_acceptance_criterion_of_the_frontend_spec_is_in_its_test_plan():
    defined = set(re.findall(r"^\| (S\d-\d) \|", FRONT, re.M))
    plan = FRONT.split("## 8. Pruebas de frontend")[1].split("## 9.")[0]
    assert defined and defined == set(re.findall(r"S\d-\d", plan)), (defined ^ set(re.findall(r"S\d-\d", plan)))


def test_frontend_spec_screens_map_to_use_cases_that_list_the_new_requirement():
    """FR-025 debe estar realizado por los UC de donar, registrar y retirar."""
    for path in UC_FILES:
        if uc_id(path) in {"UC-009", "UC-010", "UC-014"}:
            assert "FR-025" in path.read_text(), path.name
