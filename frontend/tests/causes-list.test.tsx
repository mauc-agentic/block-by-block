import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import CausesPage from "@/app/causes/page";
import { API, server } from "./server";
import { listItem } from "./helpers";

vi.mock("next/navigation", () => import("./helpers").then((m) => m.navigationMock));

describe("UC-007 Explorar causas verificadas (S1)", () => {
  it("S1-1 muestra una tarjeta por causa con título, receptor, foto y montos", async () => {
    server.use(
      http.get(`${API}/causes`, () =>
        HttpResponse.json([listItem(), listItem({ id: 8, title: "Otra causa", recipient_name: "ana" })])
      )
    );
    const { container } = render(<CausesPage />);
    expect(await screen.findByText("Techo del comedor comunitario")).toBeInTheDocument();
    expect(screen.getByText("Otra causa")).toBeInTheDocument();
    expect(screen.getByText("miguel")).toBeInTheDocument();
    expect(screen.getAllByText(/12,50 USDT de 500,00 USDT \(2 %\)/)).toHaveLength(2);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("http://api.test/api/v1/causes/7/evidence");
  });

  it("S1-2 sin causas verificadas muestra el mensaje de vacío, no un error", async () => {
    server.use(http.get(`${API}/causes`, () => HttpResponse.json([])));
    render(<CausesPage />);
    expect(await screen.findByText("Aún no hay causas verificadas.")).toBeInTheDocument();
    expect(screen.queryByText("Reintentar")).not.toBeInTheDocument();
  });

  it("S1-3 'Ver causa' lleva a /cause/{id}", async () => {
    server.use(http.get(`${API}/causes`, () => HttpResponse.json([listItem({ id: 42 })])));
    render(<CausesPage />);
    const link = await screen.findByRole("link", { name: "Ver causa" });
    expect(link).toHaveAttribute("href", "/cause/42");
  });

  it("S1-4 pide solo GET /causes (la API devuelve únicamente Verified, BR-001)", async () => {
    let requested = "";
    server.use(
      http.get(`${API}/causes`, ({ request }) => {
        requested = new URL(request.url).pathname + new URL(request.url).search;
        return HttpResponse.json([listItem()]);
      })
    );
    render(<CausesPage />);
    await screen.findByText("Techo del comedor comunitario");
    expect(requested).toBe("/api/v1/causes");
    expect(screen.getAllByText("Verificada")).toHaveLength(1);
  });

  it("muestra el error con 'Reintentar' cuando la API falla", async () => {
    server.use(http.get(`${API}/causes`, () => HttpResponse.json({ detail: "boom" }, { status: 500 })));
    render(<CausesPage />);
    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("UC-007 filtra por nombre de título o receptor, sin acentos", async () => {
    server.use(
      http.get(`${API}/causes`, () =>
        HttpResponse.json([listItem(), listItem({ id: 8, title: "Ayuda médica", recipient_name: "Ana" })])
      )
    );
    render(<CausesPage />);
    await screen.findByText("Ayuda médica");
    await userEvent.type(screen.getByLabelText("Buscar causa por nombre"), "medica");
    expect(screen.queryByText("Techo del comedor comunitario")).not.toBeInTheDocument();
    expect(screen.getByText("Ayuda médica")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Buscar causa por nombre"));
    await userEvent.type(screen.getByLabelText("Buscar causa por nombre"), "zzz");
    expect(screen.getByText("Ninguna causa coincide con tu búsqueda.")).toBeInTheDocument();
  });
});
