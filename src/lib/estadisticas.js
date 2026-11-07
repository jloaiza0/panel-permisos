// ============================================================================
// estadisticas.js
// ----------------------------------------------------------------------------
// Todos los CÁLCULOS del dashboard: filtrar, contar, sumar horas, comparar
// años. Son funciones puras: reciben la lista de registros y devuelven
// números o listas, sin tocar la pantalla. Por eso se pueden probar solas
// (ver estadisticas.test.js) y los componentes quedan solo para dibujar.
//
// Los tipos Registro y Filtros están descritos en src/vite-env.d.ts.
// ============================================================================
import { MESES } from "../constants/meses.js";

/** Valor de un filtro cuando no se filtra nada. */
export const TODOS = "Todos";

/**
 * @typedef {{ mes: string, cantidad: number }} ConteoMes
 * @typedef {{ anio: number, cantidad: number, horas: number }} TotalAnio
 * @typedef {{ totalPermisos: number, totalHoras: number, personas: number, promedio: number }} Kpis
 */

/** Minutos → horas con 1 decimal, como número (para gráficas). */
export const minutosAHoras = (/** @type {number} */ min) => Number((min / 60).toFixed(1));

/** @param {Registro[]} regs */
const sumarMinutos = (regs) => regs.reduce((s, r) => s + (r.tiempoMin || 0), 0);

/**
 * Valores distintos de un campo, ordenados (números de menor a mayor,
 * textos en orden alfabético español: "Álvaro" va junto a "Alberto").
 * @template {keyof Registro} K
 * @param {Registro[]} regs
 * @param {K} campo
 * @returns {Registro[K][]}
 */
export function valoresUnicos(regs, campo) {
  return [...new Set(regs.map((r) => r[campo]))].sort((a, b) =>
    typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "es")
  );
}

/**
 * ¿El registro cumple los filtros de año, concepto y mes?
 * @param {Registro} r
 * @param {Partial<Filtros>} [filtros]
 */
export function coincide(r, { anio = TODOS, concepto = TODOS, mes = TODOS } = {}) {
  return (
    (anio === TODOS || r.anio === anio) &&
    (concepto === TODOS || r.concepto === concepto) &&
    (mes === TODOS || r.mes === mes)
  );
}

/**
 * @param {Registro[]} regs
 * @param {Partial<Filtros>} filtros
 */
export const filtrar = (regs, filtros) => regs.filter((r) => coincide(r, filtros));

/**
 * Los 4 indicadores de arriba del dashboard.
 * @param {Registro[]} regs
 * @returns {Kpis}
 */
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

/**
 * Los mismos indicadores del año anterior al filtrado (con los mismos
 * filtros de concepto y mes), para mostrar "+12 % vs 2024". Devuelve null
 * si no hay un año elegido o el Excel no trae datos del año anterior.
 * @param {Registro[]} regs
 * @param {Filtros} filtros
 * @returns {(Kpis & { anio: number }) | null}
 */
export function kpisAnioAnterior(regs, filtros) {
  if (filtros.anio === TODOS) return null;
  const anio = filtros.anio - 1;
  if (!regs.some((r) => r.anio === anio)) return null;
  return { anio, ...calcKpis(filtrar(regs, { ...filtros, anio })) };
}

/**
 * Variación en % entre dos valores (null si no hay contra qué comparar).
 * @param {number} actual
 * @param {number} previo
 */
export const variacion = (actual, previo) => (previo ? ((actual - previo) / previo) * 100 : null);

/**
 * Permisos de cada uno de los 12 meses, en orden. Los meses sin permisos
 * salen en cero (no desaparecen de la gráfica).
 * @param {Registro[]} regs
 * @returns {ConteoMes[]}
 */
export function contarPorMes(regs) {
  /** @type {Map<string, number>} */
  const conteo = new Map(MESES.map((m) => [m, 0]));
  for (const r of regs) {
    const actual = conteo.get(r.mes);
    if (actual !== undefined) conteo.set(r.mes, actual + 1);
  }
  return MESES.map((mes) => ({ mes, cantidad: conteo.get(mes) ?? 0 }));
}

/**
 * Cuenta registros por un campo y ordena de mayor a menor:
 * contarPor(regs, "concepto") → [{ concepto: "PERSONAL", cantidad: 5 }, ...]
 * Usa Map, así un nombre como "__proto__" o "constructor" cuenta normal.
 * @template {"nombre" | "concepto"} K
 * @param {Registro[]} regs
 * @param {K} campo
 * @param {number} [limite]
 * @returns {Array<{ [P in K]: string } & { cantidad: number }>}
 */
export function contarPor(regs, campo, limite = Infinity) {
  /** @type {Map<string, number>} */
  const conteo = new Map();
  for (const r of regs) {
    const clave = r[campo] || "Sin dato";
    conteo.set(clave, (conteo.get(clave) || 0) + 1);
  }
  return /** @type {any} */ ([...conteo]
    .map(([clave, cantidad]) => ({ [campo]: clave, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, limite));
}

/**
 * Permisos y horas por año, del más viejo al más nuevo.
 * @param {Registro[]} regs
 * @returns {TotalAnio[]}
 */
export function totalesPorAnio(regs) {
  /** @type {Map<number, { anio: number, cantidad: number, minutos: number }>} */
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

/**
 * Permisos por mes, separados por año. Es la forma que necesita Recharts
 * para dibujar una línea por año:
 *   [{ mes: "Ene", 2024: 5, 2025: 8 }, { mes: "Feb", ... }, ...]
 * @param {Registro[]} regs
 * @param {number[]} anios
 * @returns {Array<{ mes: string } & Record<number, number>>}
 */
export function mesPorAnio(regs, anios) {
  /** @type {Array<{ mes: string } & Record<number, number>>} */
  const filas = MESES.map((mes) => ({ mes, ...Object.fromEntries(anios.map((a) => [a, 0])) }));
  const fila = new Map(MESES.map((m, i) => [m, filas[i]]));
  const elegidos = new Set(anios);
  for (const r of regs) {
    const f = fila.get(r.mes);
    if (f && elegidos.has(r.anio)) f[r.anio] += 1;
  }
  return filas;
}

/**
 * Resumen de UNA persona. Si no hay año elegido, desglosa por año; si hay
 * uno, desglosa por mes de ese año.
 * @param {Registro[]} regs
 * @param {string} persona
 * @param {Partial<Filtros>} [filtros]
 */
export function resumenPersona(regs, persona, { anio = TODOS, concepto = TODOS } = {}) {
  const propios = filtrar(regs.filter((r) => r.nombre === persona), { anio, concepto });
  return {
    /** @type {"anio" | "mes"} */
    modo: anio === TODOS ? "anio" : "mes",
    total: propios.length,
    totalHoras: minutosAHoras(sumarMinutos(propios)),
    /** @type {Array<TotalAnio | ConteoMes>} */
    porPeriodo: anio === TODOS ? totalesPorAnio(propios) : contarPorMes(propios),
    porConcepto: contarPor(propios, "concepto"),
  };
}

/**
 * Quita tildes y mayúsculas: "José" y "jose" se encuentran igual.
 * @param {string} s
 */
export const normalizarTexto = (s) =>
  s.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

// Los nombres se repiten miles de veces (una fila por permiso), así que se
// normaliza cada nombre distinto una sola vez y se guarda el resultado.
/** @type {Map<string, string>} */
const nombresNormalizados = new Map();
/** @param {string} nombre */
function nombreNormalizado(nombre) {
  let n = nombresNormalizados.get(nombre);
  if (n === undefined) {
    if (nombresNormalizados.size > 50000) nombresNormalizados.clear(); // tope de memoria
    n = normalizarTexto(nombre);
    nombresNormalizados.set(nombre, n);
  }
  return n;
}

/**
 * Registros cuyo nombre contiene el texto buscado, del más reciente al más
 * antiguo. Sin texto, no devuelve nada.
 * @param {Registro[]} regs
 * @param {string} texto
 */
export function buscarPorNombre(regs, texto) {
  const q = normalizarTexto(texto);
  if (!q) return [];
  return regs
    .filter((r) => nombreNormalizado(r.nombre).includes(q))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}
