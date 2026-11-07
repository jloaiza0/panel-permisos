// Pruebas de los cálculos del dashboard. Se corren con:  npm test
import { describe, it, expect } from "vitest";
import {
  TODOS, valoresUnicos, filtrar, calcKpis, kpisAnioAnterior, variacion, contarPorMes,
  contarPor, totalesPorAnio, mesPorAnio, resumenPersona, buscarPorNombre,
} from "./estadisticas.js";

let id = 0;
const reg = (fecha, nombre, concepto, tiempoMin = 60) => {
  const [anio, m] = fecha.split("-").map(Number);
  const mes = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][m - 1];
  return { id: id++, fecha, anio, mes, nombre, concepto, tiempoMin };
};

const DATOS = [
  reg("2024-01-10", "José Pérez", "PERSONAL", 120),
  reg("2024-03-02", "Ana Ruiz", "ESTUDIO", 60),
  reg("2025-01-15", "José Pérez", "PERSONAL", 30),
  reg("2025-01-20", "José Pérez", "CITA MÉDICA", null),
  reg("2025-02-01", "Álvaro Díaz", "PERSONAL", 90),
];

describe("valoresUnicos", () => {
  it("ordena números y textos en español", () => {
    expect(valoresUnicos(DATOS, "anio")).toEqual([2024, 2025]);
    expect(valoresUnicos(DATOS, "nombre")).toEqual(["Álvaro Díaz", "Ana Ruiz", "José Pérez"]);
  });
});

describe("filtrar y calcKpis", () => {
  it("combina los tres filtros", () => {
    expect(filtrar(DATOS, { anio: 2025, concepto: "PERSONAL", mes: "Ene" })).toHaveLength(1);
    expect(filtrar(DATOS, { anio: TODOS, concepto: TODOS, mes: TODOS })).toHaveLength(5);
  });

  it("calcula los indicadores (tiempo vacío cuenta como 0)", () => {
    expect(calcKpis(DATOS)).toEqual({ totalPermisos: 5, totalHoras: 5, personas: 3, promedio: 5 / 3 });
    expect(calcKpis([])).toEqual({ totalPermisos: 0, totalHoras: 0, personas: 0, promedio: 0 });
  });

  it("compara contra el año anterior solo si existe", () => {
    const filtros = { anio: 2025, concepto: TODOS, mes: TODOS };
    expect(kpisAnioAnterior(DATOS, filtros)).toMatchObject({ anio: 2024, totalPermisos: 2 });
    expect(kpisAnioAnterior(DATOS, { ...filtros, anio: 2024 })).toBeNull();
    expect(kpisAnioAnterior(DATOS, { ...filtros, anio: TODOS })).toBeNull();
    expect(variacion(3, 2)).toBe(50);
    expect(variacion(3, 0)).toBeNull();
  });
});

describe("agrupaciones", () => {
  it("cuenta los 12 meses, aunque estén vacíos", () => {
    const porMes = contarPorMes(DATOS);
    expect(porMes).toHaveLength(12);
    expect(porMes[0]).toEqual({ mes: "Ene", cantidad: 3 });
    expect(porMes[11]).toEqual({ mes: "Dic", cantidad: 0 });
  });

  it("cuenta por campo de mayor a menor, con límite", () => {
    expect(contarPor(DATOS, "concepto")[0]).toEqual({ concepto: "PERSONAL", cantidad: 3 });
    expect(contarPor(DATOS, "nombre", 1)).toEqual([{ nombre: "José Pérez", cantidad: 3 }]);
  });

  it("no se confunde con nombres como __proto__", () => {
    const raros = [reg("2025-01-01", "__proto__", "constructor"), reg("2025-01-02", "__proto__", "constructor")];
    expect(contarPor(raros, "nombre")).toEqual([{ nombre: "__proto__", cantidad: 2 }]);
  });

  it("suma permisos y horas por año", () => {
    expect(totalesPorAnio(DATOS)).toEqual([
      { anio: 2024, cantidad: 2, horas: 3 },
      { anio: 2025, cantidad: 3, horas: 2 },
    ]);
  });

  it("arma la tabla mes × año solo con los años pedidos", () => {
    const filas = mesPorAnio(DATOS, [2025]);
    expect(filas[0]).toEqual({ mes: "Ene", 2025: 2 });
    expect(filas[1]).toEqual({ mes: "Feb", 2025: 1 });
  });
});

describe("resumenPersona", () => {
  it("desglosa por año si no hay año elegido", () => {
    const r = resumenPersona(DATOS, "José Pérez", { anio: TODOS, concepto: TODOS });
    expect(r.modo).toBe("anio");
    expect(r.total).toBe(3);
    expect(r.porPeriodo.map((p) => p.cantidad)).toEqual([1, 2]);
  });

  it("desglosa por mes si hay un año elegido", () => {
    const r = resumenPersona(DATOS, "José Pérez", { anio: 2025, concepto: "PERSONAL" });
    expect(r.modo).toBe("mes");
    expect(r.total).toBe(1);
    expect(r.porPeriodo).toHaveLength(12);
  });
});

describe("buscarPorNombre", () => {
  it("ignora tildes y mayúsculas, y ordena del más reciente", () => {
    const r = buscarPorNombre(DATOS, "  jose ");
    expect(r.map((x) => x.fecha)).toEqual(["2025-01-20", "2025-01-15", "2024-01-10"]);
    expect(buscarPorNombre(DATOS, "ALVARO")).toHaveLength(1);
    expect(buscarPorNombre(DATOS, "   ")).toEqual([]);
  });
});
