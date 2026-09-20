import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import CausesPage from "@/app/causes/page";
import FaqPage from "@/app/faq/page";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { mapApiError } from "@/lib/api";
import { formatUsdt } from "@/lib/format";
import { getLang, setLang, t } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { es } from "@/lib/i18n/es";
import { API, server } from "./server";
import { listItem } from "./helpers";

vi.mock("next/navigation", () => import("./helpers").then((m) => m.navigationMock));

describe("NFR-019 Idiomas ES / EN", () => {
  it("el inglés tiene las mismas claves y los mismos marcadores {x} que el español", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
    for (const key of Object.keys(es) as (keyof typeof es)[]) {
      const ph = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(",");
      expect(ph(en[key]), key).toBe(ph(es[key]));
    }
  });

  it("el idioma por defecto es español y el cambio se recuerda en localStorage", () => {
    expect(getLang()).toBe("es");
    setLang("en");
    expect(localStorage.getItem("bbb_lang")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(t("nav.login")).toBe("Log in");
  });

  it("el selector cambia la interfaz sin recargar", async () => {
    server.use(http.get(`${API}/causes`, () => HttpResponse.json([listItem()])));
    render(
      <>
        <LanguageSwitcher />
        <CausesPage />
      </>
    );
    expect(await screen.findByRole("link", { name: "Ver causa" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(await screen.findByRole("link", { name: "View cause" })).toBeInTheDocument();
    expect(screen.getByText("Verified causes")).toBeInTheDocument();
    expect(screen.getByText(/12\.50 USDT of 500\.00 USDT \(2 %\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "ES" }));
    expect(await screen.findByRole("link", { name: "Ver causa" })).toBeInTheDocument();
  });

  it("los montos y los errores de la API siguen el idioma activo", () => {
    expect(formatUsdt("1234.500000")).toBe(`${new Intl.NumberFormat("es-CO").format(1234)},50 USDT`);
    setLang("en");
    expect(formatUsdt("1234.500000")).toBe("1,234.50 USDT");
    expect(mapApiError(400, "No funds to withdraw")).toBe("There are no funds to withdraw.");
    expect(mapApiError(401, "Not authenticated")).toBe("Your session expired. Log in again.");
  });

  it("la página de preguntas frecuentes y sus contenidos largos cambian de idioma", () => {
    setLang("en");
    render(<FaqPage />);
    expect(screen.getByText("Frequently asked questions")).toBeInTheDocument();
    expect(screen.getByText("What is Block by Block?")).toBeInTheDocument();
  });
});
