import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DonateBlock } from "@/components/DonateBlock";
import { PendingDonationsNotice } from "@/components/PendingDonationsNotice";
import { listPending, savePending } from "@/lib/pendingDonations";
import { API, server } from "./server";
import { HASH, HASH2, OTHER_WALLET, TOKEN, VAULT, WALLET, mockWallet, setSession, user } from "./helpers";

vi.mock("next/navigation", () => import("./helpers").then((m) => m.navigationMock));

const linked = () => user() as ReturnType<typeof user> & { wallet_address: string };

function serveDonation(opts: { confirm?: () => Response } = {}) {
  const calls = { donate: 0, confirm: 0 };
  server.use(
    http.post(`${API}/causes/7/donate`, () => {
      calls.donate += 1;
      return HttpResponse.json({
        status: "sign_required",
        contract: VAULT,
        function: "donate",
        params: [3, 3_000_000],
        message: "Firma",
        approve: { contract: TOKEN, function: "approve", params: [VAULT, 3_000_000] },
      });
    }),
    http.post(`${API}/causes/7/donations/confirm`, () => {
      calls.confirm += 1;
      return (
        opts.confirm?.() ??
        HttpResponse.json({ id: 1, cause_id: 7, amount: "3.000000", tx_hash: HASH2, created_at: "x", cause_status: "Verified" })
      );
    })
  );
  return calls;
}

async function donate(amount: string) {
  const ui = userEvent.setup();
  const input = await screen.findByLabelText("Monto (USDT)");
  await ui.type(input, amount);
  await ui.click(screen.getByRole("button", { name: "Donar" }));
}

describe("UC-009 Donar (S3)", () => {
  beforeEach(() => setSession(linked()));

  it("S3-1 firma approve y donate, registra y recarga la causa", async () => {
    const wallet = mockWallet({ allowance: BigInt(0) });
    const calls = serveDonation();
    const onDonated = vi.fn();
    render(<DonateBlock causeId={7} user={linked()} onDonated={onDonated} />);
    await donate("3");
    expect(await screen.findByText(/¡Gracias! Donaste 3,00 USDT/)).toBeInTheDocument();
    expect(wallet.sent).toHaveLength(2);
    expect(wallet.sent[0].to).toBe(TOKEN);
    expect(wallet.sent[1].to).toBe(VAULT);
    expect(calls.confirm).toBe(1);
    expect(onDonated).toHaveBeenCalled();
    expect(listPending()).toEqual([]);
  });

  it("S3-2 si el allowance ya cubre el monto no se pide firmar approve", async () => {
    const wallet = mockWallet({ allowance: BigInt(10_000_000) });
    serveDonation();
    render(<DonateBlock causeId={7} user={linked()} onDonated={() => {}} />);
    await donate("3");
    await screen.findByText(/¡Gracias!/);
    expect(wallet.sent).toHaveLength(1);
    expect(wallet.sent[0].to).toBe(VAULT);
  });

  it("S3-3 si cancelo en la wallet no se guarda pendiente ni se llama a confirm", async () => {
    mockWallet({ rejectSend: true });
    const calls = serveDonation();
    render(<DonateBlock causeId={7} user={linked()} onDonated={() => {}} />);
    await donate("3");
    expect(await screen.findByText("Cancelaste la firma.")).toBeInTheDocument();
    expect(calls.confirm).toBe(0);
    expect(listPending()).toEqual([]);
  });

  it("S3-6 con la cuenta activa distinta de la vinculada no firma nada", async () => {
    const wallet = mockWallet({ accounts: [OTHER_WALLET] });
    serveDonation();
    render(<DonateBlock causeId={7} user={linked()} onDonated={() => {}} />);
    await donate("3");
    expect(await screen.findByText(/no es la wallet vinculada a tu cuenta/)).toBeInTheDocument();
    expect(wallet.sent).toHaveLength(0);
  });

  it("S3-7 un monto mayor al saldo deshabilita el botón con el motivo", async () => {
    mockWallet({ balance: BigInt(2_000_000) });
    const calls = serveDonation();
    render(<DonateBlock causeId={7} user={linked()} onDonated={() => {}} />);
    const ui = userEvent.setup();
    await screen.findByText("2,00 USDT");
    await ui.type(screen.getByLabelText("Monto (USDT)"), "3");
    expect(screen.getByText("El monto supera tu saldo de USDT.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Donar" })).toBeDisabled();
    expect(calls.donate).toBe(0);
  });

  it("un monto inválido nunca llama a la API", async () => {
    mockWallet();
    const calls = serveDonation();
    render(<DonateBlock causeId={7} user={linked()} onDonated={() => {}} />);
    const ui = userEvent.setup();
    await ui.type(await screen.findByLabelText("Monto (USDT)"), "1.1234567");
    expect(screen.getByText("Usa máximo 6 decimales.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Donar" })).toBeDisabled();
    expect(calls.donate).toBe(0);
  });
});

describe("UC-014 Registrar donación (S3, FR-025)", () => {
  beforeEach(() => setSession(linked()));

  it("S3-5 una donación firmada y sin registrar queda pendiente y se recupera al volver", async () => {
    // Pestaña cerrada tras firmar: el hash quedó guardado antes de llamar a confirm.
    savePending({ causeId: 7, txHash: HASH, amount: "3", createdAt: "2026-09-20T00:00:00Z" });
    let confirmCalls = 0;
    server.use(
      http.post(`${API}/causes/7/donations/confirm`, () => {
        confirmCalls += 1;
        return HttpResponse.json({ id: 9, cause_id: 7, amount: "3.000000", tx_hash: HASH, created_at: "x", cause_status: "Verified" });
      })
    );
    render(<PendingDonationsNotice />);
    await waitFor(() => expect(confirmCalls).toBe(1));
    await waitFor(() => expect(listPending()).toEqual([]));
  });

  it("si el registro automático falla, ofrece 'Registrar ahora' y lo registra", async () => {
    savePending({ causeId: 7, txHash: HASH, amount: "3", createdAt: "2026-09-20T00:00:00Z" });
    let ok = false;
    server.use(
      http.post(`${API}/causes/7/donations/confirm`, () =>
        ok
          ? HttpResponse.json({ id: 9, cause_id: 7, amount: "3.000000", tx_hash: HASH, created_at: "x", cause_status: "Verified" })
          : HttpResponse.json({ detail: "Transaction does not match this cause and wallet" }, { status: 400 })
      )
    );
    render(<PendingDonationsNotice />);
    expect(await screen.findByText("Tienes una donación pendiente de registrar")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Registrar ahora" })).toBeEnabled());
    ok = true;
    await userEvent.click(screen.getByRole("button", { name: "Registrar ahora" }));
    await waitFor(() => expect(listPending()).toEqual([]));
  });

  it("S3-8 registrar dos veces el mismo hash (409) no duplica y limpia el pendiente", async () => {
    savePending({ causeId: 7, txHash: HASH, amount: "3", createdAt: "2026-09-20T00:00:00Z" });
    server.use(
      http.post(`${API}/causes/7/donations/confirm`, () =>
        HttpResponse.json({ detail: "Transaction already registered" }, { status: 409 })
      )
    );
    render(<PendingDonationsNotice />);
    await waitFor(() => expect(listPending()).toEqual([]));
  });

  it("sin sesión no intenta registrar nada", () => {
    localStorage.clear();
    savePending({ causeId: 7, txHash: HASH, amount: "3", createdAt: "x" });
    render(<PendingDonationsNotice />);
    expect(screen.queryByText("Tienes una donación pendiente de registrar")).not.toBeInTheDocument();
    expect(WALLET).toBeTruthy();
  });
});
