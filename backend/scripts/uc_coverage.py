"""Cobertura de especificación: qué flujos alternativos (A*) y reglas de negocio (BR-*) de cada UC tiene una prueba.

Una prueba cubre un flujo o regla si su nombre sigue la convención de CLAUDE.md: `test_uc009_br001_...`, `test_uc014_a2_...`,
`test_uc011_a2_a3_...` o, para varios UC, `test_uc014_br001_uc007_br002_...` (pytest), `test_UC010_BR001_...` (Foundry) o `it('UC-009 BR-001 ...')` / `describe('UC-009 ...')` (frontend).
Uso: cd backend && python -m scripts.uc_coverage [--json]
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs"
SEARCH_DIRS = [ROOT / "backend" / "tests", ROOT / "contracts" / "test", ROOT / "frontend"]
SKIP_PARTS = {"node_modules", ".next", "__pycache__"}


def spec_items(uc_file: Path) -> dict[str, list[str]]:
    text = uc_file.read_text()
    return {
        "A": re.findall(r"^### (A\d+):", text, re.M),
        "BR": re.findall(r"^### (BR-\d{3}):", text, re.M),
    }


def covered_items() -> dict[str, set[str]]:
    """UC-### -> {A1, BR-001, ...} referenciados por nombres de pruebas."""
    covered: dict[str, set[str]] = {}
    files = [p for d in SEARCH_DIRS if d.exists() for p in d.rglob("*")
             if p.is_file() and p.suffix in {".py", ".sol", ".ts", ".tsx"} and not SKIP_PARTS & set(p.parts)]
    for path in files:
        text = path.read_text(errors="ignore")
        names = re.findall(r"def (test_uc\d{3}[a-z0-9_]*)", text) + \
            [n.lower() for n in re.findall(r"function (test_UC\d{3}[A-Za-z0-9_]*)", text)]   # pytest y Foundry
        for name in names:
            current = None
            for token in name.split("_")[1:]:                       # test_uc014_br001_uc007_br002_... -> UC-014: BR-001; UC-007: BR-002
                if re.fullmatch(r"uc\d{3}", token):
                    current = "UC-" + token[2:]
                    covered.setdefault(current, set())
                elif current and re.fullmatch(r"a\d+", token):
                    covered[current].add(token.upper())
                elif current and re.fullmatch(r"br\d{3}", token):
                    covered[current].add(f"BR-{token[2:]}")
        for title in re.findall(r"""(?:it|test|describe)\(\s*['"`](UC-\d{3}[^'"`]*)""", text):   # vitest: it('UC-009 A2 BR-001 ...')
            uc = re.match(r"UC-\d{3}", title).group(0)
            bucket = covered.setdefault(uc, set())
            bucket.update(m.upper() for m in re.findall(r"\bA\d+\b", title))
            bucket.update(m for m in re.findall(r"BR-\d{3}", title))
    return covered


def report() -> dict:
    covered = covered_items()
    result = {}
    for path in sorted((DOCS / "use_cases").glob("UC-*.md")):
        uc = re.match(r"(UC-\d{3})", path.name).group(1)
        items = spec_items(path)
        have = covered.get(uc, set())
        flows = items["A"] + items["BR"]
        result[uc] = {
            "status": re.search(r"\*\*Status:\*\* (\w+)", path.read_text()).group(1),
            "total": len(flows),
            "covered": [i for i in flows if i in have],
            "missing": [i for i in flows if i not in have],
        }
    return result


AUDIT = DOCS / "use_case_audit.md"
BEGIN, END = "<!-- BEGIN COVERAGE -->", "<!-- END COVERAGE -->"


def render_markdown(data: dict) -> str:
    lines = ["| UC | Estado | Con prueba | Sin prueba (por convención de nombres) |", "|----|--------|-----------|----------------------------------------|"]
    for uc, d in data.items():
        lines.append(f"| {uc} | {d['status']} | {len(d['covered'])}/{d['total']} | {', '.join(d['missing']) or '—'} |")
    total, cov = sum(d["total"] for d in data.values()), sum(len(d["covered"]) for d in data.values())
    lines.append(f"| **Total** | | **{cov}/{total} ({cov * 100 // total} %)** | |")
    return "\n".join(lines) + "\n"


def current_block(text: str) -> str:
    return text[text.index(BEGIN) + len(BEGIN):text.index(END)].strip("\n") + "\n"


if __name__ == "__main__" and ("--write-doc" in sys.argv or "--check-doc" in sys.argv):
    text = AUDIT.read_text()
    block = render_markdown(report())
    if "--check-doc" in sys.argv:
        sys.exit(0 if current_block(text) == block else 1)
    AUDIT.write_text(text[:text.index(BEGIN) + len(BEGIN)] + "\n" + block + text[text.index(END):])
    print(f"actualizado: {AUDIT}")
    sys.exit(0)

if __name__ == "__main__":
    data = report()
    if "--json" in sys.argv:
        print(json.dumps(data, indent=1, ensure_ascii=False))
    else:
        print(f"{'UC':7} {'Estado':11} {'Cubiertos':>9}  Sin prueba")
        for uc, d in data.items():
            print(f"{uc:7} {d['status']:11} {len(d['covered']):>3}/{d['total']:<3}     {', '.join(d['missing']) or '—'}")
        total, cov = sum(d["total"] for d in data.values()), sum(len(d["covered"]) for d in data.values())
        print(f"\nTotal: {cov}/{total} flujos y reglas con prueba ({cov * 100 // total} %)")
