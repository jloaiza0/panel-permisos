// @vitest-environment jsdom
// Pruebas del dashboard completo: filtros, indicadores y secciones.
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "./Dashboard.jsx";
import { DATOS } from "./test/datos.js";

const montar = () => {
  const user = userEvent.setup();
  render(<Dashboard datos={DATOS} nombreArchivo="permisos.xlsx" onReiniciar={() => {}} />);
  return user;
};

const kpi = (etiqueta) => screen.getByText(etiqueta).closest(".kpi").querySelector(".kpi-value").textContent;
const filtro = (grupo, texto) =>
  within(screen.getByRole("group", { name: `Filtrar por ${grupo}` })).getByRole("button", { name: new RegExp(`^${texto}$`) });

describe("Dashboard", () => {
  it("muestra el archivo, los indicadores y pone el foco en el título", () => {
    montar();
    expect(screen.getByText("permisos.xlsx")).toBeInTheDocument();
    expect(kpi("Total permisos")).toBe("6");
    expect(kpi("Personas con permisos")).toBe("3");
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
    expect(screen.getByText(/Mostrando/)).toHaveTextContent("Mostrando 6 de 6 permisos");
  });

  it("filtra por concepto y mes, y limpia los filtros", async () => {
    const user = montar();
    expect(screen.queryByRole("button", { name: /Limpiar filtros/ })).not.toBeInTheDocument();

    await user.click(filtro("concepto", "PERSONAL"));
    expect(kpi("Total permisos")).toBe("4");
    expect(filtro("concepto", "PERSONAL")).toHaveAttribute("aria-pressed", "true");

    await user.click(filtro("mes", "Ene"));
    expect(kpi("Total permisos")).toBe("2");

    await user.click(screen.getByRole("button", { name: /Limpiar filtros/ }));
    expect(kpi("Total permisos")).toBe("6");
  });

  it("con un año elegido compara contra el año anterior y oculta el comparativo", async () => {
    const user = montar();
    expect(screen.getByRole("heading", { name: "Comparativo entre años" })).toBeInTheDocument();

    await user.click(within(screen.getByRole("group", { name: "Filtrar por año" })).getByRole("button", { name: "2025" }));
    expect(kpi("Total permisos")).toBe("4");
    expect(screen.getAllByText("vs 2024").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Comparativo entre años" })).not.toBeInTheDocument();
  });

  it("explica cuando los filtros no dejan resultados", async () => {
    const user = montar();
    await user.click(filtro("concepto", "ESTUDIO"));
    await user.click(filtro("mes", "Dic"));
    expect(screen.getByRole("heading", { name: "No hay permisos con estos filtros" })).toBeInTheDocument();
    expect(screen.getByText(/No hay registros de ESTUDIO en Dic/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Quitar filtros de concepto y mes" }));
    expect(kpi("Total permisos")).toBe("6");
  });

  it("muestra el resumen de una persona", async () => {
    const user = montar();
    expect(screen.getByText(/Elige una persona/)).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Persona" }), "José Pérez");
    const seccion = screen.getByRole("heading", { name: "Resumen por persona" }).closest("section");
    expect(within(seccion).getByText("Total permisos").nextSibling).toHaveTextContent("3");
    expect(within(seccion).getByText("Total horas").nextSibling).toHaveTextContent("2,5");
  });

  it("avisa si la persona no tiene permisos con los filtros actuales", async () => {
    const user = montar();
    await user.click(filtro("concepto", "ESTUDIO"));
    await user.selectOptions(screen.getByRole("combobox", { name: "Persona" }), "Álvaro Díaz");
    expect(screen.getByText(/no tiene permisos con los filtros actuales/)).toBeInTheDocument();
  });

  it("el comparador con el mismo año en los dos lados lo muestra una sola vez", async () => {
    const user = montar();
    await user.selectOptions(screen.getByRole("combobox", { name: "Primer año" }), "2025");
    const seccion = screen.getByRole("heading", { name: "Comparativo entre años" }).closest("section");
    expect(within(seccion).getAllByText(/^Permisos 2025$/)).toHaveLength(1);
    expect(within(seccion).queryByText(/^Permisos 2024$/)).not.toBeInTheDocument();
  });
});
