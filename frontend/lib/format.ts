// S6: formato de montos USDT y direcciones. Los montos llegan como string de 6
// decimales y NUNCA pasan por parseFloat: se leen como enteros (BigInt) de
// micro-USDT para no perder precisión (frontend_spec §3.2).

import { parseUnits } from "viem";

export const USDT_DECIMALS = 6;

const EXPLORER_URL = (
  process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://testnet-explorer.hskchain.net"
).replace(/\/+$/, "");

/** Convierte un monto decimal (string/number) a micro-USDT (6 decimales). */
export function toMicros(value: string | number): bigint {
  return parseUnits(String(value), USDT_DECIMALS);
}

/** Valida un monto escrito por la persona: > 0 y máximo 6 decimales. */
export function parseUsdtInput(raw: string): { ok: true; micros: bigint } | { ok: false; reason: string } {
  const text = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(text)) return { ok: false, reason: "Escribe un monto válido." };
  const decimals = text.split(".")[1]?.length ?? 0;
  if (decimals > USDT_DECIMALS) return { ok: false, reason: "Usa máximo 6 decimales." };
  const micros = parseUnits(text, USDT_DECIMALS);
  if (micros <= BigInt(0)) return { ok: false, reason: "El monto debe ser mayor que cero." };
  return { ok: true, micros };
}

/** `12.500000` -> `12,50 USDT` (es-CO, 2 decimales, redondeo half-up). */
export function formatUsdt(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const cents = (toMicros(value) + BigInt(5000)) / BigInt(10000);
  const whole = cents / BigInt(100);
  const frac = (cents % BigInt(100)).toString().padStart(2, "0");
  return `${new Intl.NumberFormat("es-CO").format(whole)},${frac} USDT`;
}

/** Porcentaje entero recaudado (sin tope: puede superar 100). */
export function percentOf(collected: string | number, target: string | number): number {
  const t = toMicros(target);
  if (t <= BigInt(0)) return 0;
  return Number((toMicros(collected) * BigInt(100)) / t);
}

export function formatPercent(collected: string | number, target: string | number): string {
  return `${percentOf(collected, target)} %`;
}

export function shortAddress(value: string): string {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${EXPLORER_URL}/address/${address}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}
