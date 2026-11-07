import { C } from "../../constants/colores.js";
import { fmtNum } from "../../lib/formato.js";

// Número que solo se dibuja sobre la barra más alta (el mes pico), en vez
// de poner un número en cada barra. Recharts la llama una vez por barra.
export default function PeakLabel({ x, y, width, value, max }) {
  if (!max || value !== max) return null;
  return (
    <text x={x + width / 2} y={y - 8} textAnchor="middle" fill={C.ink} fontSize={12} fontWeight={600}>
      {fmtNum(value)}
    </text>
  );
}
