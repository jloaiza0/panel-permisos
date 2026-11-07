// ============================================================================
// colores.js
// ----------------------------------------------------------------------------
// Colores de las gráficas. No son códigos fijos sino variables CSS (--s1 ...
// en styles/index.css): cambian solas entre modo claro y oscuro, y las
// gráficas SVG aceptan "var(--s1)" como color.
//
// La paleta está validada para daltonismo: los colores que quedan uno al
// lado del otro se distinguen también con visión de colores alterada.
// ============================================================================

// Series para gráficas con varios colores (años, conceptos).
export const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];

// Gráficas de UNA sola serie: gris azulado neutro, para no confundirse con
// el verde de "CITA MÉDICA".
export const SINGLE = "var(--single)";

// Colores de texto y líneas de las gráficas.
export const C = {
  ink: "var(--ink)",
  ink2: "var(--ink-2)",
  grid: "var(--grid)",
  axis: "var(--axis)",
  surface: "var(--surface)",
};

// Cada concepto tiene SIEMPRE el mismo color, sin importar su posición en el
// ranking (si no, al filtrar cambiarían de color). Un concepto nuevo que no
// esté aquí usa el color de respaldo.
const CONCEPT_COLORS = {
  "CITA MÉDICA": SERIES[0],
  "PERSONAL": SERIES[1],
  "ESTUDIO": SERIES[2],
  "COMPENSATORIO": SERIES[3],
  "C VOTACION": SERIES[4],
};
const FALLBACK_COLOR = "var(--fallback)";

export const colorConcepto = (concepto) => CONCEPT_COLORS[concepto] || FALLBACK_COLOR;

// Color de un año según su posición en la lista de años del Excel: 2024 es
// del mismo color en todas las gráficas.
export const colorDeAnio = (anios, anio) => SERIES[Math.max(0, anios.indexOf(anio)) % SERIES.length];
