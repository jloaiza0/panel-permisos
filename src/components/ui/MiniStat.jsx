import { fmtNum } from "../../lib/formato.js";

/**
 * Estadística pequeña dentro de una tarjeta. Si recibe "color", un puntito
 * indica a qué año pertenece.
 *
 * @param {{ label: string, value: number, color?: string }} props
 */
export default function MiniStat({ label, value, color }) {
  return (
    <div>
      <div className="stat-label">
        {color && <span className="stat-dot" style={{ background: color }} aria-hidden="true" />}
        {label}
      </div>
      <div className="stat-value num">{fmtNum(value)}</div>
    </div>
  );
}
