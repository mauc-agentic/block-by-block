import { formatUsdt } from "@/lib/format";

// S6: monto USDT formateado (es-CO, 2 decimales); `null` se muestra como "—".
export function UsdtAmount({ value }: { value: string | number | null | undefined }) {
  return <span className="font-mono tabular-nums">{formatUsdt(value)}</span>;
}
