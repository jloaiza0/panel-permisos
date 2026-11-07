// ============================================================================
// chartTheme.js
// ----------------------------------------------------------------------------
// Ajustes comunes de todas las gráficas (Recharts), para que se vean como
// un solo sistema: rejilla fina y sólida, ejes grises sin rayitas, números
// con separador colombiano y animaciones cortas.
//
// Los /** @type {const} */ marcan valores exactos ("right", "ease-out"),
// que es lo que Recharts acepta, en vez de "cualquier texto".
// ============================================================================
import { C } from "../../constants/colores.js";
import { fmtNum } from "../../lib/formato.js";

// ¿El usuario pidió "reducir movimiento" en su sistema operativo?
const REDUCE_MOTION =
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

// Recharts anima 1,5 s por defecto; con filtros que cambias seguido eso se
// siente lento. 300 ms con ease-out muestra el cambio sin hacer esperar.
export const ANIM = {
  isAnimationActive: !REDUCE_MOTION,
  animationDuration: 300,
  animationEasing: /** @type {const} */ ("ease-out"),
};

export const GRID_H = { stroke: C.grid, vertical: false };
export const GRID_V = { stroke: C.grid, horizontal: false };

const TICK = { fontSize: 12, fill: C.ink2 };
export const TICK_INK = { fontSize: 12, fill: C.ink, fontWeight: 500 };
export const AXIS_X = { tick: TICK, axisLine: { stroke: C.axis }, tickLine: false, tickMargin: 8 };
export const AXIS_Y = { tick: TICK, axisLine: false, tickLine: false, allowDecimals: false, width: 36 };

// Tooltips sin animación: aparecen muchísimas veces seguidas.
export const TOOLTIP_BAR = { isAnimationActive: false, cursor: { fill: "var(--chart-cursor)" } };
export const TOOLTIP_LINE = { isAnimationActive: false, cursor: { stroke: C.axis, strokeWidth: 1 } };

// Valor escrito en la punta de las barras (horizontales o verticales).
const LABEL = {
  fill: C.ink,
  fontSize: 12,
  fontWeight: 600,
  formatter: (/** @type {unknown} */ v) => fmtNum(v),
};
export const LABEL_DERECHA = { ...LABEL, position: /** @type {const} */ ("right"), offset: 8 };
export const LABEL_ARRIBA = { ...LABEL, position: /** @type {const} */ ("top"), offset: 8 };

// Leyenda con puntito de color. El texto se pinta en tinta desde el CSS
// (.recharts-legend-item-text), porque en amarillo o naranja se lee mal.
export const LEGEND = {
  iconType: /** @type {const} */ ("circle"),
  iconSize: 8,
  wrapperStyle: { fontSize: 12, paddingTop: 8 },
};

// Puntos de las líneas: con borde del color de la tarjeta para separarlos.
/** @param {string} color */
export const puntos = (color) => ({
  dot: { r: 3.5, fill: color, stroke: C.surface, strokeWidth: 2 },
  activeDot: { r: 5, fill: color, stroke: C.surface, strokeWidth: 2 },
});
