// ============================================================================
// formato.js
// ----------------------------------------------------------------------------
// Funciones pequeñas para mostrar datos en pantalla (números, horas, fechas).
// Todo en formato colombiano: 1.946 permisos, 7,5 horas.
// ============================================================================
import { MESES } from "../constants/meses.js";

// 1946 → "1.946". Si no es número, lo devuelve como texto.
/** @param {unknown} v @returns {string} */
export const fmtNum = (v) => (typeof v === "number" ? v.toLocaleString("es-CO") : String(v ?? ""));

// Minutos → horas con máximo 1 decimal: 480 → "8", 450 → "7,5".
export const fmtHoras = (/** @type {number} */ min) => (min / 60).toLocaleString("es-CO", { maximumFractionDigits: 1 });

// "2025-03-14" → "14 Mar 2025". Se arma a mano (sin new Date) porque
// new Date("2025-03-14") se interpreta en UTC y en Colombia mostraría el 13.
/** @param {string} iso */
export function fmtFecha(iso) {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MESES[Number(m) - 1]} ${y}`;
}

// Recorta un texto largo con "…" al final.
/** @param {string} texto @param {number} max */
export const recortar = (texto, max) =>
  texto.length > max ? texto.slice(0, max - 1).trimEnd() + "…" : texto;

// Resumen en texto de una gráfica, para lectores de pantalla:
// [{mes:"Ene", cantidad:3}, ...] → "Ene: 3; Feb: 5; ...".
/**
 * @param {Array<Record<string, any>>} filas
 * @param {string} etiqueta
 * @param {string} valor
 */
export const describir = (filas, etiqueta, valor) =>
  filas.map((f) => `${f[etiqueta]}: ${fmtNum(f[valor])}`).join("; ");
