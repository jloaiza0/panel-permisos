// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConsultaPersona from "./ConsultaPersona.jsx";
import { DATOS, registro } from "../test/datos.js";

describe("ConsultaPersona", () => {
  it("busca sin tildes ni mayúsculas y muestra fecha y horas en formato local", async () => {
    const user = userEvent.setup();
    render(<ConsultaPersona registros={DATOS} />);
    await user.type(screen.getByRole("searchbox", { name: "Buscar por nombre" }), "JOSE");

    expect(screen.getByText("3 registros")).toBeInTheDocument();
    const filas = screen.getAllByRole("row").slice(1);
    expect(filas[0]).toHaveTextContent("20 Ene 2025");
    expect(filas[0]).toHaveTextContent("—"); // sin tiempo registrado
    expect(filas[2]).toHaveTextContent("2"); // 120 minutos = 2 horas
  });

  it("dice cuando no hay resultados", async () => {
    const user = userEvent.setup();
    render(<ConsultaPersona registros={DATOS} />);
    await user.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText(/No hay registros para “zzz”/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("dibuja máximo 200 filas con muchos resultados", async () => {
    const muchos = Array.from({ length: 250 }, (_, i) =>
      registro(`2025-01-${String((i % 28) + 1).padStart(2, "0")}`, "Persona Repetida", "PERSONAL"));
    const user = userEvent.setup();
    render(<ConsultaPersona registros={muchos} />);
    await user.type(screen.getByRole("searchbox"), "a");

    expect(screen.getByText(/Mostrando los 200 más recientes de 250/)).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(201); // + encabezado
  });
});
