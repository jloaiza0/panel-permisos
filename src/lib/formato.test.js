import { describe, it, expect } from "vitest";
import { fmtNum, fmtHoras, fmtFecha, recortar, describir } from "./formato.js";

describe("formato", () => {
  it("números y horas en formato colombiano", () => {
    expect(fmtNum(1946)).toBe("1.946");
    expect(fmtNum("texto")).toBe("texto");
    expect(fmtHoras(480)).toBe("8");
    expect(fmtHoras(450)).toBe("7,5");
  });

  it("fechas sin correrse un día por la zona horaria", () => {
    expect(fmtFecha("2025-03-01")).toBe("1 Mar 2025");
    expect(fmtFecha("2024-12-31")).toBe("31 Dic 2024");
  });

  it("recorta textos largos y describe gráficas", () => {
    expect(recortar("María Fernanda López", 10)).toBe("María Fer…");
    expect(recortar("Ana", 10)).toBe("Ana");
    expect(describir([{ mes: "Ene", cantidad: 1200 }, { mes: "Feb", cantidad: 3 }], "mes", "cantidad")).toBe("Ene: 1.200; Feb: 3");
  });
});
