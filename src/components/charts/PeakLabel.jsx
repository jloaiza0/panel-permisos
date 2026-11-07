import { C } from "../../constants/colores.js";
import { fmtNum } from "../../lib/formato.js";

/**
 * Número que solo se dibuja sobre la barra más alta (el mes pico), en vez
 * de poner un número en cada barra. Recharts la llama una vez por barra y
 * le pasa la posición (x, y, width) y el valor.
 *
 * @param {{ x?: number | string, y?: number | string, width?: number | string, value?: unknown, max: number }} props
 */
export default function PeakLabel({ x = 0, y = 0, width = 0, value, max }) {
  if (!max || value !== max) return null;
  return (
    <text x={Number(x) + Number(width) / 2} y={Number(y) - 8} textAnchor="middle" fill={C.ink} fontSize={12} fontWeight={600}>
      {fmtNum(value)}
    </text>
  );
}
