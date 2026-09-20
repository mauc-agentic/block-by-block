"""Genera el bloque de endpoints y esquemas de docs/api_contract.md desde el código (app.openapi()).

Uso: cd backend && python -m scripts.generate_api_contract          # reescribe el bloque generado
     python -m scripts.generate_api_contract --check                # falla si el documento está desactualizado
"""
import re
import sys
from pathlib import Path

from app.main import app

DOC = Path(__file__).resolve().parents[2] / "docs" / "api_contract.md"
BEGIN, END = "<!-- BEGIN GENERATED -->", "<!-- END GENERATED -->"


def type_of(schema: dict, spec: dict) -> str:
    if "$ref" in schema:
        return schema["$ref"].split("/")[-1]
    if "anyOf" in schema:
        options = [o for o in schema["anyOf"] if o.get("type") != "null"]
        nullable = len(options) != len(schema["anyOf"])
        kinds = {o.get("type") for o in options}
        text = "decimal (string)" if kinds == {"number", "string"} else " | ".join(type_of(o, spec) for o in options)
        return text + (" | null" if nullable else "")
    kind = schema.get("type", "object")
    if kind == "array":
        return f"list[{type_of(schema.get('items', {}), spec)}]"
    if kind == "string" and schema.get("format") == "date-time":
        return "datetime (ISO 8601, UTC)"
    if kind == "string" and schema.get("pattern", "").startswith("^(?!^[-+.]*$)"):
        return "decimal (string)"  # Decimal de Pydantic: viaja como texto
    return kind


def render() -> str:
    spec = app.openapi()
    lines = ["### Endpoints", "", "| Método | Ruta | Auth | UC | Cuerpo | Respuesta 200 |", "|---|---|---|---|---|---|"]
    for path, ops in sorted(spec["paths"].items()):
        for method, op in ops.items():
            uc = ", ".join(dict.fromkeys(re.findall(r"UC-\d{3}", op.get("description", "") or op.get("summary", ""))))
            auth = "Bearer" if op.get("security") else "—"
            body = op.get("requestBody", {}).get("content", {})
            body_t = type_of(body["application/json"]["schema"], spec) if "application/json" in body else (
                "multipart (image)" if "multipart/form-data" in body else "—")
            ok = op["responses"].get("200", {}).get("content", {})
            resp_t = type_of(ok["application/json"]["schema"], spec) if "application/json" in ok else "—"
            lines.append(f"| {method.upper()} | `{path}` | {auth} | {uc or '—'} | {body_t} | {resp_t} |")
    lines += ["", "### Esquemas", ""]
    for name, schema in sorted(spec["components"]["schemas"].items()):
        if name in {"HTTPValidationError", "ValidationError"} or name.startswith("Body_"):
            continue
        required = set(schema.get("required", []))
        lines += [f"**{name}**", "", "| Campo | Tipo | Requerido |", "|---|---|---|"]
        for field, prop in schema.get("properties", {}).items():
            lines.append(f"| `{field}` | {type_of(prop, spec)} | {'sí' if field in required else 'no'} |")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def current_block(text: str) -> str:
    return text[text.index(BEGIN) + len(BEGIN):text.index(END)].strip("\n") + "\n"


if __name__ == "__main__":
    text = DOC.read_text()
    generated = render()
    if "--check" in sys.argv:
        sys.exit(0 if current_block(text) == generated else 1)
    DOC.write_text(text[:text.index(BEGIN) + len(BEGIN)] + "\n" + generated + text[text.index(END):])
    print(f"actualizado: {DOC}")
