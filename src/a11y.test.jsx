// @vitest-environment jsdom
// Auditoría automática de accesibilidad con axe-core (el mismo motor de
// Lighthouse y Chrome DevTools) sobre cada pantalla y sus estados.
//
// El contraste de colores no se puede medir aquí (jsdom no calcula estilos
// reales); se verificó en un navegador real, en modo claro y oscuro.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import App from "./App.jsx";
import Dashboard from "./Dashboard.jsx";
import { DATOS } from "./test/datos.js";

/** Corre axe y devuelve los problemas encontrados en texto legible. */
async function problemas(contenedor = document.body) {
  const resultado = await axe.run(contenedor, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
    rules: { "color-contrast": { enabled: false } },
  });
  return resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

const filtro = (texto) => screen.getAllByRole("button", { name: new RegExp(`^${texto}$`) })[0];

describe("Accesibilidad (axe)", () => {
  it("control: axe sí detecta problemas reales", async () => {
    // Errores a propósito: imagen sin texto alternativo y botón sin nombre.
    const { container } = render(
      <div>
        {/* oxlint-disable-next-line jsx-a11y/alt-text */}
        <img src="x.png" />
        {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
        <button type="button"></button>
      </div>
    );
    const encontrados = (await problemas(container)).join(" ");
    expect(encontrados).toMatch(/image-alt/);
    expect(encontrados).toMatch(/button-name/);
  });

  it("pantalla de carga, también con un error", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<App />);
    expect(await problemas()).toEqual([]);

    await user.upload(document.querySelector('input[type="file"]'), new File(["x"], "notas.txt"));
    await screen.findByRole("alert");
    expect(await problemas()).toEqual([]);
  });

  it("dashboard completo, con filtros, persona y búsqueda", async () => {
    const user = userEvent.setup();
    render(<Dashboard datos={DATOS} nombreArchivo="permisos.xlsx" onReiniciar={() => {}} />);
    expect(await problemas()).toEqual([]);

    await user.click(filtro("PERSONAL"));
    await user.selectOptions(screen.getByRole("combobox", { name: "Persona" }), "José Pérez");
    await user.type(screen.getByRole("searchbox"), "jose");
    expect(await problemas()).toEqual([]);
  });

  it("estado sin resultados", async () => {
    const user = userEvent.setup();
    render(<Dashboard datos={DATOS} nombreArchivo="permisos.xlsx" onReiniciar={() => {}} />);
    await user.click(filtro("ESTUDIO"));
    await user.click(filtro("Dic"));
    expect(screen.getByRole("heading", { name: "No hay permisos con estos filtros" })).toBeInTheDocument();
    expect(await problemas()).toEqual([]);
  });

  it("el enlace para saltar los filtros es lo primero tras el título", async () => {
    const user = userEvent.setup();
    render(<Dashboard datos={DATOS} nombreArchivo="permisos.xlsx" onReiniciar={() => {}} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Saltar a los resultados" })).toHaveFocus();
  });
});
