"""Genera el bloque de resumen de docs/IMPLEMENTATION-STATUS.md leyendo los propios documentos AIUP.

Los estados de UC, requisitos, casos de prueba y brechas se leen de sus archivos: el resumen no se escribe a mano y no puede
contradecirlos. Uso: cd backend && python -m scripts.aiup_summary            # reescribe el bloque
                     python -m scripts.aiup_summary --check                 # falla si está desactualizado
"""
import re
import sys
from collections import Counter
from pathlib import Path

DOCS = Path(__file__).resolve().parents[2] / "docs"
DOC = DOCS / "IMPLEMENTATION-STATUS.md"
BEGIN, END = "<!-- BEGIN SUMMARY -->", "<!-- END SUMMARY -->"
SEVERITY_ORDER = ["Crítica", "Alta", "Media", "Baja"]


def use_cases() -> list[tuple[str, str, str]]:
    rows = []
    for path in sorted((DOCS / "use_cases").glob("UC-*.md")):
        text = path.read_text()
        rows.append((re.match(r"(UC-\d{3})", path.name).group(1),
                     re.search(r"\*\*Use Case Name:\*\* (.+?)\s*$", text, re.M).group(1),
                     re.search(r"\*\*Status:\*\* (\w+)", text).group(1)))
    return rows


def test_cases() -> list[tuple[str, str, str]]:
    rows = []
    for path in sorted((DOCS / "test_cases").glob("TC-*.md")):
        text = path.read_text()
        rows.append((re.match(r"(TC-\d{3})", path.name).group(1),
                     re.search(r"^# Test Case: (.+)$", text, re.M).group(1),
                     re.search(r"\*\*Status:\*\* (\w+)", text).group(1)))
    return rows


def requirements() -> list[tuple[str, str, str]]:
    text = (DOCS / "requirements.md").read_text()
    return [(m.group(1), m.group(2).strip(), m.group(3).strip())
            for m in re.finditer(r"^\| ((?:FR|NFR|C)-\d{3}) \| ([^|]+)\|.*\|\s*([A-Za-z ]+?)\s*\|$", text, re.M)]


def gaps(text: str) -> list[tuple[str, str]]:
    body = text.split(BEGIN)[0] + text.split(END)[-1]
    return re.findall(r"^\| (GAP-\d{3}) \| ([^|]+?) +\|", body, re.M)


def render(status_text: str) -> str:
    ucs, tcs, reqs, gap_list = use_cases(), test_cases(), requirements(), gaps(status_text)
    out = ["### Casos de uso", "", "| UC | Caso de uso | Estado |", "|----|-------------|--------|"]
    out += [f"| {i} | {name} | {status} |" for i, name, status in ucs]
    out += ["", "### Casos de prueba (journeys)", "", "| TC | Journey | Estado |", "|----|---------|--------|"]
    out += [f"| {i} | {name} | {status} |" for i, name, status in tcs]

    out += ["", "### Requisitos por estado", "", "| Tipo | Verified | Implemented | In Progress | Open | Deferred | Total |",
            "|------|----------|-------------|-------------|------|----------|-------|"]
    for kind, label in (("FR", "Funcionales (FR)"), ("NFR", "No funcionales (NFR)"), ("C", "Restricciones (C)")):
        counts = Counter(s for i, _, s in reqs if i.split("-")[0] == kind)
        out.append(f"| {label} | " + " | ".join(str(counts.get(s, 0)) for s in
                   ("Verified", "Implemented", "In Progress", "Open", "Deferred")) + f" | {sum(counts.values())} |")
    pending = [(i, t, s) for i, t, s in reqs if s in {"Open", "In Progress"}]
    out += ["", "Requisitos aún no terminados:", ""] + [f"- **{i}** {t} — {s}" for i, t, s in pending]

    open_gaps = [g for g, s in gap_list if s != "Resuelta"]
    by_sev = Counter(s for _, s in gap_list if s != "Resuelta")
    out += ["", "### Brechas", "", "| Crítica | Alta | Media | Baja | Abiertas | Resueltas | Total |", "|---------|------|-------|------|----------|-----------|-------|",
            "| " + " | ".join(str(by_sev.get(s, 0)) for s in SEVERITY_ORDER) +
            f" | {len(open_gaps)} | {len(gap_list) - len(open_gaps)} | {len(gap_list)} |"]
    return "\n".join(out) + "\n"


def current_block(text: str) -> str:
    return text[text.index(BEGIN) + len(BEGIN):text.index(END)].strip("\n") + "\n"


if __name__ == "__main__":
    text = DOC.read_text()
    generated = render(text)
    if "--check" in sys.argv:
        sys.exit(0 if current_block(text) == generated else 1)
    DOC.write_text(text[:text.index(BEGIN) + len(BEGIN)] + "\n" + generated + text[text.index(END):])
    print(f"actualizado: {DOC}")
