import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateCausePage from "@/app/cause/create/page";
import { API, server } from "./server";
import { HASH, VAULT, cause, mockWallet, nav, setSession, user } from "./helpers";

vi.mock("next/navigation", () => import("./helpers").then((m) => m.navigationMock));

describe("UC-004 Crear causa (S5)", () => {
  beforeEach(() => {
    nav.push.mockClear();
    nav.replace.mockClear();
  });

  it("S5-2 sin wallet vinculada redirige a /wallet antes de crear nada", async () => {
    setSession(user({ wallet_address: null }));
    render(<CreateCausePage />);
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/wallet"));
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument();
  });

  it("S5-1 al terminar publicación y foto navega a /cause/{id}", async () => {
    setSession(user());
    mockWallet();
    server.use(
      http.post(`${API}/causes`, () => HttpResponse.json(cause({ id: 55, status: "Pending", image_url: null }), { status: 201 })),
      http.post(`${API}/causes/55/publish`, () =>
        HttpResponse.json({ status: "sign_required", contract: VAULT, function: "createCause", params: ["t", "d", "500000000"], message: "x" })
      ),
      http.post(`${API}/causes/55/publish/confirm`, () => HttpResponse.json(cause({ id: 55, status: "Pending", image_url: null }))),
      http.post(`${API}/causes/55/upload-image`, () => HttpResponse.json({ cause_id: 55, image_hash: "h", status: "Pending" }))
    );
    render(<CreateCausePage />);
    const ui = userEvent.setup();
    await ui.type(screen.getByLabelText("Título"), "Techo del comedor");
    await ui.type(screen.getByLabelText("Descripción"), "El comedor necesita reparar el techo urgentemente.");
    await ui.type(screen.getByLabelText("Monto objetivo (USDT)"), "500");
    await ui.upload(screen.getByLabelText("Foto de evidencia"), new File(["x"], "f.png", { type: "image/png" }));
    // jsdom valida `step` con coma flotante; se envía el formulario directamente.
    fireEvent.submit(screen.getByRole("button", { name: "Crear y publicar causa" }).closest("form")!);
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/cause/55"));
    expect(HASH).toBeTruthy();
  });

  it("S5-3 si la causa ya estaba publicada (409) sigue con la foto sin volver a firmar", async () => {
    setSession(user());
    const wallet = mockWallet();
    server.use(
      http.post(`${API}/causes`, () => HttpResponse.json(cause({ id: 56, status: "Pending", image_url: null }), { status: 201 })),
      http.post(`${API}/causes/56/publish`, () => HttpResponse.json({ detail: "Cause already published on-chain" }, { status: 409 })),
      http.post(`${API}/causes/56/upload-image`, () => HttpResponse.json({ cause_id: 56, image_hash: "h", status: "Pending" }))
    );
    render(<CreateCausePage />);
    const ui = userEvent.setup();
    await ui.type(screen.getByLabelText("Título"), "Techo del comedor");
    await ui.type(screen.getByLabelText("Descripción"), "El comedor necesita reparar el techo urgentemente.");
    await ui.type(screen.getByLabelText("Monto objetivo (USDT)"), "500");
    await ui.upload(screen.getByLabelText("Foto de evidencia"), new File(["x"], "f.png", { type: "image/png" }));
    // jsdom valida `step` con coma flotante; se envía el formulario directamente.
    fireEvent.submit(screen.getByRole("button", { name: "Crear y publicar causa" }).closest("form")!);
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/cause/56"));
    expect(wallet.sent).toHaveLength(0);
  });
});
