import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/dashboard/page";
import { API, server } from "./server";
import { HASH, TOKEN, VAULT, WALLET, cause, dashboard, mockWallet, nav, setSession, user } from "./helpers";

vi.mock("next/navigation", () => import("./helpers").then((m) => m.navigationMock));

const withdrawable = (over = {}) => ({ ...cause({ recipient_id: 2, donations: [] }), available_to_withdraw: "10.000000", ...over });

describe("UC-011 Ver dashboard (S4)", () => {
  beforeEach(() => {
    nav.push.mockClear();
    nav.replace.mockClear();
    setSession(user());
  });

  it("S4-1 muestra mis causas, mis donaciones y total_donated", async () => {
    server.use(
      http.get(`${API}/users/me/dashboard`, () =>
        HttpResponse.json(
          dashboard({
            causes: [withdrawable()],
            total_donated: "3.000000",
            donations: [{ cause_id: 9, cause_title: "Otra causa", amount: "3.000000", tx_hash: HASH, created_at: "2026-09-20T10:00:00Z" }],
          })
        )
      )
    );
    render(<DashboardPage />);
    expect(await screen.findByText("Techo del comedor comunitario")).toBeInTheDocument();
    expect(screen.getByText("Otra causa")).toBeInTheDocument();
    expect(screen.getByText(/Total donado:/).textContent).toContain("3,00 USDT");
  });

  it("S4-2 sin causas ni donaciones muestra los estados vacíos", async () => {
    server.use(http.get(`${API}/users/me/dashboard`, () => HttpResponse.json(dashboard())));
    render(<DashboardPage />);
    expect(await screen.findByText(/Todavía no has creado ninguna causa/)).toBeInTheDocument();
    expect(screen.getByText("Aún no has donado.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explorar causas" })).toHaveAttribute("href", "/causes");
  });

  it("S4-3 retira: pide confirmación, firma withdrawFunds y recarga con disponible 0", async () => {
    const wallet = mockWallet();
    let withdrawn = false;
    server.use(
      http.get(`${API}/users/me/dashboard`, () =>
        HttpResponse.json(dashboard({ causes: [withdrawable({ available_to_withdraw: withdrawn ? "0.000000" : "10.000000" })] }))
      ),
      http.post(`${API}/causes/7/withdraw`, () =>
        HttpResponse.json({ status: "sign_required", contract: VAULT, function: "withdrawFunds", params: [3], message: "x", amount: "10.000000", to_wallet: WALLET })
      )
    );
    render(<DashboardPage />);
    const ui = userEvent.setup();
    await ui.click(await screen.findByRole("button", { name: "Retirar" }));
    expect(await screen.findByText(/Retirarás/)).toHaveTextContent("10,00 USDT");
    withdrawn = true;
    await ui.click(screen.getByRole("button", { name: "Confirmar retiro" }));
    expect(await screen.findByText(/Retiro confirmado/)).toBeInTheDocument();
    expect(wallet.sent).toHaveLength(1);
    expect(wallet.sent[0].to).toBe(VAULT);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Retirar" })).not.toBeInTheDocument());
    expect(screen.getByText(/Disponible para retirar:/).textContent).toContain("0,00 USDT");
  });

  it("S4-4 con available_to_withdraw nulo muestra '—' y no ofrece Retirar", async () => {
    server.use(
      http.get(`${API}/users/me/dashboard`, () =>
        HttpResponse.json(dashboard({ causes: [withdrawable({ available_to_withdraw: null })] }))
      )
    );
    render(<DashboardPage />);
    const line = await screen.findByText(/Disponible para retirar:/);
    expect(line.textContent).toContain("—");
    expect(screen.queryByRole("button", { name: "Retirar" })).not.toBeInTheDocument();
  });

  it("S4-5 solo muestra los datos que devuelve la API para el usuario autenticado", async () => {
    let auth = "";
    server.use(
      http.get(`${API}/users/me/dashboard`, ({ request }) => {
        auth = request.headers.get("authorization") ?? "";
        return HttpResponse.json(dashboard());
      })
    );
    render(<DashboardPage />);
    await screen.findByText("Hola, carlos");
    expect(auth).toBe("Bearer jwt-token");
  });

  it("S4-6 'Ver USDT en mi wallet' agrega el token con símbolo USDT y 6 decimales", async () => {
    const wallet = mockWallet();
    server.use(http.get(`${API}/users/me/dashboard`, () => HttpResponse.json(dashboard())));
    render(<DashboardPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Ver USDT en mi wallet" }));
    await waitFor(() =>
      expect(wallet.request).toHaveBeenCalledWith({
        method: "wallet_watchAsset",
        params: { type: "ERC20", options: { address: TOKEN, symbol: "USDT", decimals: 6 } },
      })
    );
  });

  it("UC-011 A3 muestra la alerta cuando no hay wallet vinculada", async () => {
    server.use(
      http.get(`${API}/users/me/dashboard`, () =>
        HttpResponse.json(dashboard({ wallet_linked: false, user: { ...user(), wallet_address: null } }))
      )
    );
    render(<DashboardPage />);
    expect(await screen.findByText("No tienes una wallet vinculada")).toBeInTheDocument();
  });

  it("UC-002 A2 un 401 limpia la sesión y redirige a login", async () => {
    server.use(http.get(`${API}/users/me/dashboard`, () => HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })));
    render(<DashboardPage />);
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/auth/login"));
    expect(localStorage.getItem("bbb_token")).toBeNull();
  });

  it("UC-006 una causa En revisión ofrece el motivo de rechazo cuando fue rechazada", async () => {
    server.use(
      http.get(`${API}/users/me/dashboard`, () =>
        HttpResponse.json(dashboard({ causes: [withdrawable({ status: "Rejected", available_to_withdraw: null })] }))
      )
    );
    render(<DashboardPage />);
    const ui = userEvent.setup();
    await ui.click(await screen.findByRole("button", { name: "Ver por qué se rechazó" }));
    expect(within(screen.getByRole("dialog")).getByText(/La foto muestra/)).toBeInTheDocument();
  });
});
