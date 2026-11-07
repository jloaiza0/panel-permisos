// @vitest-environment jsdom
// Recorrido completo: subir un Excel, ver el dashboard y volver a empezar.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as XLSX from "xlsx";
import App from "./App.jsx";

function archivoExcel(nombre, filas) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas, { cellDates: true }), "Hoja1");
  return new File([XLSX.write(wb, { type: "array", bookType: "xlsx" })], nombre);
}

const VALIDO = [
  ["Fecha", "Nombre", "Concepto", "Tiempo"],
  ...Array.from({ length: 5 }, (_, i) => [new Date(2025, i, 10), `Persona ${i}`, "PERSONAL", 0.25]),
];

// El <input type="file"> está oculto: la zona de carga lo abre al hacer clic.
const inputArchivo = () => document.querySelector('input[type="file"]');

describe("App", () => {
  it("muestra la pantalla de carga con la ayuda de formato", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Panel de ausentismo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Selecciona o arrastra tu Excel de permisos/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Descargar plantilla/ })).toHaveAttribute("href", expect.stringMatching(/plantilla-permisos.xlsx$/));
    expect(screen.getByText(/v\d+\.\d+\.\d+/)).toBeInTheDocument();
  });

  it("rechaza un archivo que no es Excel", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<App />);
    await user.upload(inputArchivo(), new File(["hola"], "notas.txt"));
    expect(await screen.findByRole("alert")).toHaveTextContent("El archivo debe ser .xlsx o .xls");
  });

  it("rechaza un Excel sin las columnas necesarias", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.upload(inputArchivo(), archivoExcel("malo.xlsx", [["a", "b"], [1, 2]]));
    expect(await screen.findByRole("alert")).toHaveTextContent("Faltan las columnas");
  });

  it("carga un Excel válido, muestra el dashboard y permite volver", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.upload(inputArchivo(), archivoExcel("permisos.xlsx", VALIDO));

    expect(await screen.findByText("permisos.xlsx", {}, { timeout: 12000 })).toBeInTheDocument();
    expect(screen.getByText("5 registros")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Otro archivo" }));
    expect(screen.getByRole("button", { name: /^Selecciona o arrastra tu Excel de permisos/ })).toBeInTheDocument();
  });

  it("la zona de carga se puede abrir con el teclado", async () => {
    const user = userEvent.setup();
    render(<App />);
    let abierto = 0;
    inputArchivo().addEventListener("click", () => abierto++);
    screen.getByRole("button", { name: /^Selecciona o arrastra tu Excel de permisos/ }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(abierto).toBe(2);
  });
});
