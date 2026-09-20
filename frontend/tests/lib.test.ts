import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, confirmDonation, mapApiError } from "@/lib/api";
import { formatUsdt, parseUsdtInput, percentOf, shortAddress, toMicros } from "@/lib/format";
import { listPending, removePending, savePending } from "@/lib/pendingDonations";
import { API, server } from "./server";
import { HASH, setSession, user } from "./helpers";

describe("S6 formato (NFR-016)", () => {
  it("formatUsdt redondea a 2 decimales sin perder precisión", () => {
    expect(formatUsdt("12.500000")).toBe("12,50 USDT");
    expect(formatUsdt("0.005000")).toBe("0,01 USDT");
    expect(formatUsdt("0.004999")).toBe("0,00 USDT");
    expect(formatUsdt("9007199254740993.000000")).toBe(`${new Intl.NumberFormat("es-CO").format(BigInt("9007199254740993"))},00 USDT`);
    expect(formatUsdt(null)).toBe("—");
  });

  it("toMicros usa parseUnits con 6 decimales", () => {
    expect(toMicros("0.1")).toBe(BigInt(100000));
    expect(toMicros("3")).toBe(BigInt(3_000_000));
  });

  it("parseUsdtInput valida monto > 0 y máximo 6 decimales", () => {
    expect(parseUsdtInput("3")).toEqual({ ok: true, micros: BigInt(3_000_000) });
    expect(parseUsdtInput("1,5")).toEqual({ ok: true, micros: BigInt(1_500_000) });
    expect(parseUsdtInput("0").ok).toBe(false);
    expect(parseUsdtInput("abc").ok).toBe(false);
    expect(parseUsdtInput("-1").ok).toBe(false);
    expect(parseUsdtInput("1.1234567").ok).toBe(false);
  });

  it("percentOf y shortAddress", () => {
    expect(percentOf("12.5", "500")).toBe(2);
    expect(percentOf("1", "0")).toBe(0);
    expect(shortAddress("0x94C5E2065F555e01364ad83879D3ADDD298E706f")).toBe("0x94C5…706f");
  });
});

describe("S6 mapApiError (frontend_spec §7)", () => {
  const cases: [number, unknown, string][] = [
    [401, "Not authenticated", "Tu sesión expiró. Inicia sesión de nuevo."],
    [400, "Link a wallet first", "Vincula tu wallet para continuar."],
    [400, "Only verified causes", "Esta causa ya no recibe donaciones."],
    [400, "Amount > 0", "Escribe un monto válido."],
    [422, [{ msg: "x" }], "Escribe un monto válido."],
    [400, "Transaction not confirmed or not a donation", "Aún no vemos tu transacción; seguimos intentando…"],
    [400, "Transaction does not match this cause and wallet", "Esa transacción no salió de la wallet vinculada a tu cuenta. Cambia a esa cuenta en Rabby."],
    [409, "Transaction already registered", "Esta donación ya estaba registrada."],
    [409, "Cause already published on-chain", "Tu causa ya estaba publicada; seguimos con la foto."],
    [409, "Verification already in progress", "Ya estamos verificando tu causa."],
    [400, "Can only verify Pending causes", "Esta causa ya tiene resultado."],
    [400, "Publish the cause on-chain first", "Antes debes publicar la causa."],
    [400, "Upload evidence first", "Antes debes subir la foto."],
    [400, "No funds to withdraw", "No hay fondos para retirar."],
    [403, "Only the cause owner can do this", "Solo el titular de la causa puede hacerlo."],
    [404, "Cause not found", "Esta causa no existe."],
    [413, "Image > 5 MB", "La foto debe ser JPG o PNG de hasta 5 MB."],
    [400, "Only JPEG and PNG allowed", "La foto debe ser JPG o PNG de hasta 5 MB."],
  ];
  it.each(cases)("%i %j", (status, detail, message) => {
    expect(mapApiError(status, detail)).toBe(message);
  });
});

describe("S6 pendingDonations (FR-025)", () => {
  it("guarda, lista y borra sin duplicar por hash", () => {
    const item = { causeId: 7, txHash: HASH, amount: "3", createdAt: "2026-09-20T00:00:00Z" };
    savePending(item);
    savePending(item);
    expect(listPending()).toEqual([item]);
    removePending(HASH);
    expect(listPending()).toEqual([]);
  });

  it("tolera datos corruptos", () => {
    localStorage.setItem("bbb_pending_donations", "{no es json");
    expect(listPending()).toEqual([]);
  });
});

describe("UC-014 confirmDonation", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setSession(user());
  });
  afterEach(() => vi.useRealTimers());

  it("S3-4 reintenta 'not confirmed' cada 3 s y termina en éxito", async () => {
    let calls = 0;
    server.use(
      http.post(`${API}/causes/7/donations/confirm`, () => {
        calls += 1;
        if (calls < 3) return HttpResponse.json({ detail: "Transaction not confirmed or not a donation" }, { status: 400 });
        return HttpResponse.json({ id: 1, cause_id: 7, amount: "3.000000", tx_hash: HASH, created_at: "x", cause_status: "Verified" });
      })
    );
    const pending = confirmDonation(7, HASH);
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);
    await expect(pending).resolves.toMatchObject({ id: 1 });
    expect(calls).toBe(3);
  });

  it("S3-8 un 409 (ya registrada) cuenta como éxito", async () => {
    server.use(
      http.post(`${API}/causes/7/donations/confirm`, () =>
        HttpResponse.json({ detail: "Transaction already registered" }, { status: 409 })
      )
    );
    await expect(confirmDonation(7, HASH)).resolves.toBeNull();
  });

  it("agota el tiempo y propaga el error", async () => {
    server.use(
      http.post(`${API}/causes/7/donations/confirm`, () =>
        HttpResponse.json({ detail: "Transaction not confirmed or not a donation" }, { status: 400 })
      )
    );
    const pending = confirmDonation(7, HASH, { intervalMs: 10, timeoutMs: 25 });
    const assertion = expect(pending).rejects.toBeInstanceOf(ApiError);
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });
});
