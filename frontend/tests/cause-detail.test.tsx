import { act, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CauseDetailPage from "@/app/cause/[id]/page";
import { API, server } from "./server";
import { cause, mockWallet, nav, setSession, user } from "./helpers";

vi.mock("next/navigation", () => import("./helpers").then((m) => m.navigationMock));

function serve(c: ReturnType<typeof cause>) {
  server.use(http.get(`${API}/causes/7`, () => HttpResponse.json(c)));
}

describe("UC-008 Ver detalle de causa (S2)", () => {
  beforeEach(() => {
    nav.params = { id: "7" };
    mockWallet();
  });

  it("S2-1 causa verificada: estado, objetivo, recaudado, veredicto y donaciones con enlace a la tx", async () => {
    serve(cause());
    render(<CauseDetailPage />);
    expect(await screen.findByText("Techo del comedor comunitario")).toBeInTheDocument();
    expect(screen.getAllByText("Verificada").length).toBeGreaterThan(0);
    expect(screen.getByText(/12,50 USDT de 500,00 USDT \(2 %\)/)).toBeInTheDocument();
    expect(screen.getByText(/La foto muestra un techo dañado/)).toBeInTheDocument();
    expect(screen.getByText(/Confianza del modelo: 90%/)).toBeInTheDocument();
    const txLink = screen.getByRole("link", { name: "Ver transacción" });
    expect(txLink.getAttribute("href")).toContain("/tx/0x");
  });

  it("S2-2 causa inexistente: 'Esta causa no existe'", async () => {
    server.use(http.get(`${API}/causes/7`, () => HttpResponse.json({ detail: "Cause not found" }, { status: 404 })));
    render(<CauseDetailPage />);
    expect(await screen.findByText("Esta causa no existe")).toBeInTheDocument();
  });

  it("S2-5 causa rechazada: muestra motivo y confianza", async () => {
    serve(cause({ status: "Rejected", verification_reason: "La foto no muestra la necesidad.", verification_confidence: "0.70", image_url: null }));
    render(<CauseDetailPage />);
    expect(await screen.findByText("La foto no muestra la necesidad.")).toBeInTheDocument();
    expect(screen.getByText(/Confianza del modelo: 70%/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Donar" })).not.toBeInTheDocument();
  });

  it("S2-5 el titular de una causa rechazada ve 'Crear otra causa'", async () => {
    setSession(user({ id: 1 }));
    serve(cause({ status: "Rejected" }));
    render(<CauseDetailPage />);
    expect(await screen.findByRole("link", { name: "Crear otra causa" })).toBeInTheDocument();
  });

  it("S2-6 el titular no ve el bloque Donar en su propia causa", async () => {
    setSession(user({ id: 1 }));
    serve(cause());
    render(<CauseDetailPage />);
    expect(await screen.findByRole("link", { name: "Ir a mi dashboard" })).toBeInTheDocument();
    expect(screen.queryByText("Donar a esta causa")).not.toBeInTheDocument();
  });

  it("S2-7 una causa completada no muestra el bloque Donar", async () => {
    setSession(user());
    serve(cause({ status: "Completed", collected: "500.000000" }));
    render(<CauseDetailPage />);
    expect(await screen.findByText("Meta alcanzada")).toBeInTheDocument();
    expect(screen.queryByText("Donar a esta causa")).not.toBeInTheDocument();
  });

  it("otro usuario con wallet ve el bloque Donar; sin sesión, la invitación a iniciar sesión", async () => {
    serve(cause());
    const { unmount } = render(<CauseDetailPage />);
    expect(await screen.findByRole("link", { name: "Inicia sesión" })).toBeInTheDocument();
    unmount();

    setSession(user());
    render(<CauseDetailPage />);
    expect(await screen.findByText("Donar a esta causa")).toBeInTheDocument();
  });
});

describe("UC-006 Verificación de la causa (S2)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    nav.params = { id: "7" };
    setSession(user({ id: 1 }));
  });
  afterEach(() => vi.useRealTimers());

  it("S2-3 el titular ve el veredicto sin recargar cuando el estado cambia", async () => {
    let status: "Pending" | "Verified" = "Pending";
    server.use(
      http.get(`${API}/causes/7`, () =>
        HttpResponse.json(cause({ status, image_url: status === "Pending" ? null : "/causes/7/evidence" }))
      )
    );
    render(<CauseDetailPage />);
    expect(await screen.findByText(/En revisión… esta página se actualiza sola/)).toBeInTheDocument();
    status = "Verified";
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    await waitFor(() => expect(screen.getByText(/La foto muestra un techo dañado/)).toBeInTheDocument());
    expect(screen.queryByText(/se actualiza sola/)).not.toBeInTheDocument();
  });

  it("S2-4 a los 2 minutos aparece 'Reintentar verificación' y llama a POST /verify", async () => {
    let verifyCalls = 0;
    server.use(
      http.get(`${API}/causes/7`, () => HttpResponse.json(cause({ status: "Pending", image_url: null }))),
      http.post(`${API}/causes/7/verify`, () => {
        verifyCalls += 1;
        return HttpResponse.json({ status: "queued" }, { status: 202 });
      })
    );
    render(<CauseDetailPage />);
    await screen.findByText(/En revisión…/);
    expect(screen.queryByRole("button", { name: "Reintentar verificación" })).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    const button = await screen.findByRole("button", { name: "Reintentar verificación" });
    await act(async () => button.click());
    await waitFor(() => expect(verifyCalls).toBe(1));
    expect(await screen.findByText("Verificación en cola")).toBeInTheDocument();
  });
});
