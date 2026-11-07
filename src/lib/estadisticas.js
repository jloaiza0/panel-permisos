// ============================================================================
// estadisticas.js
// ----------------------------------------------------------------------------
// Todos los CÁLCULOS del dashboard: filtrar, contar, sumar horas, comparar
// años. Son funciones puras: reciben la lista de registros y devuelven
// números o listas, sin tocar la pantalla. Por eso se pueden probar solas
// (ver estadisticas.test.js) y los componentes quedan solo para dibujar.
//
// Cada registro tiene esta forma (la arma lib/excel/parseExcel.js):
//   { id, fecha: "2025-03-14", anio: 2025, mes: "Mar",
//     nombre: "Juan Pérez", concepto: "PERSONAL", tiempoMin: 480 }
// ============================================================================
import { MESES } from "../constants/meses.js";

// Valor de un filtro cuando no se filtra nada.
export const TODOS = "Todos";

// Minutos → horas con 1 decimal, como número (para gráficas).
export const minutosAHoras = (min) => Number((min / 60).toFixed(1));

const sumarMinutos = (regs) => regs.reduce((s, r) => s + (r.tiempoMin || 0), 0);

// Valores distintos de un campo, ordenados (números de menor a mayor,
// textos en orden alfabético español: "Álvaro" va junto a "Alberto").
export function valoresUnicos(regs, campo) {
  return [...new Set(regs.map((r) => r[campo]))].sort((a, b) =>
    typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "es")
  );
}

// ¿El registro cumple los filtros de año, concepto y mes?
export function coincide(r, { anio = TODOS, concepto = TODOS, mes = TODOS } = {}) {
  return (
    (anio === TODOS || r.anio === anio) &&
    (concepto === TODOS || r.concepto === concepto) &&
    (mes === TODOS || r.mes === mes)
  );
}

export const filtrar = (regs, filtros) => regs.filter((r) => coincide(r, filtros));

// Los 4 indicadores de arriba del dashboard.
export function calcKpis(regs) {
  const totalPermisos = regs.length;
  const personas = new Set(regs.map((r) => r.nombre)).size;
  return {
    totalPermisos,
    totalHoras: sumarMinutos(regs) / 60,
    personas,
    promedio: personas ? totalPermisos / personas : 0,
  };
}

// Los mismos indicadores del año anterior al filtrado (con los mismos
// filtros de concepto y mes), para mostrar "+12 % vs 2024". Devuelve null
// si no hay un año elegido o el Excel no trae datos del año anterior.
export function kpisAnioAnterior(regs, filtros) {
  if (filtros.anio === TODOS) return null;
  const anio = filtros.anio - 1;
  if (!regs.some((r) => r.anio === anio)) return null;
  return { anio, ...calcKpis(filtrar(regs, { ...filtros, anio })) };
}

// Variación en % entre dos valores (null si no hay contra qué comparar).
export const variacion = (actual, previo) => (previo ? ((actual - previo) / previo) * 100 : null);

// Permisos de cada uno de los 12 meses, en orden. Los meses sin permisos
// salen en cero (no desaparecen de la gráfica).
export function contarPorMes(regs) {
  const conteo = new Map(MESES.map((m) => [m, 0]));
  for (const r of regs) if (conteo.has(r.mes)) conteo.set(r.mes, conteo.get(r.mes) + 1);
  return MESES.map((mes) => ({ mes, cantidad: conteo.get(mes) }));
}

// Cuenta registros por un campo y ordena de mayor a menor:
// contarPor(regs, "concepto") → [{ concepto: "PERSONAL", cantidad: 5 }, ...]
// Usa Map, así un nombre como "__proto__" o "constructor" cuenta normal.
export function contarPor(regs, campo, limite = Infinity) {
  const conteo = new Map();
  for (const r of regs) {
    const clave = r[campo] || "Sin dato";
    conteo.set(clave, (conteo.get(clave) || 0) + 1);
  }
  return [...conteo]
    .map(([clave, cantidad]) => ({ [campo]: clave, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, limite);
}

// Permisos y horas por año, del más viejo al más nuevo.
export function totalesPorAnio(regs) {
  const porAnio = new Map();
  for (const r of regs) {
    const t = porAnio.get(r.anio) ?? { anio: r.anio, cantidad: 0, minutos: 0 };
    t.cantidad += 1;
    t.minutos += r.tiempoMin || 0;
    porAnio.set(r.anio, t);
  }
  return [...porAnio.values()]
    .sort((a, b) => a.anio - b.anio)
    .map(({ anio, cantidad, minutos }) => ({ anio, cantidad, horas: minutosAHoras(minutos) }));
}

// Permisos por mes, separados por año. Es la forma que necesita Recharts
// para dibujar una línea por año:
//   [{ mes: "Ene", 2024: 5, 2025: 8 }, { mes: "Feb", ... }, ...]
export function mesPorAnio(regs, anios) {
  const filas = MESES.map((mes) => ({ mes, ...Object.fromEntries(anios.map((a) => [a, 0])) }));
  const fila = new Map(MESES.map((m, i) => [m, filas[i]]));
  const elegidos = new Set(anios);
  for (const r of regs) {
    if (elegidos.has(r.anio) && fila.has(r.mes)) fila.get(r.mes)[r.anio] += 1;
  }
  return filas;
}

// Resumen de UNA persona. Si no hay año elegido, desglosa por año; si hay
// uno, desglosa por mes de ese año.
export function resumenPersona(regs, persona, { anio = TODOS, concepto = TODOS } = {}) {
  const propios = filtrar(regs.filter((r) => r.nombre === persona), { anio, concepto });
  return {
    modo: anio === TODOS ? "anio" : "mes",
    total: propios.length,
    totalHoras: minutosAHoras(sumarMinutos(propios)),
    porPeriodo: anio === TODOS ? totalesPorAnio(propios) : contarPorMes(propios),
    porConcepto: contarPor(propios, "concepto"),
  };
}

// Quita tildes y mayúsculas: "José" y "jose" se encuentran igual.
export const normalizarTexto = (s) =>
  s.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

// Registros cuyo nombre contiene el texto buscado, del más reciente al más
// antiguo. Sin texto, no devuelve nada.
export function buscarPorNombre(regs, texto) {
  const q = normalizarTexto(texto);
  if (!q) return [];
  return regs
    .filter((r) => normalizarTexto(r.nombre).includes(q))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}
