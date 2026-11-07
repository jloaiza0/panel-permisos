import { fmtNum } from "../../lib/formato.js";

/**
 * Cajita que aparece al pasar el mouse sobre una gráfica. Reemplaza la de
 * Recharts porque esa pinta el TEXTO del color de la serie (en amarillo o
 * naranja casi no se lee): aquí el texto va en tinta y el color en un
 * puntito. "colorOf" sirve cuando cada barra tiene su propio color.
 * Recharts le pasa active, payload y label al dibujarla.
 *
 * @param {{
 *   active?: boolean,
 *   payload?: ReadonlyArray<{ dataKey?: unknown, name?: unknown, value?: unknown, color?: string }>,
 *   label?: any,
 *   colorOf?: (label: any) => string,
 * }} props
 */
export default function ChartTooltip({ active, payload, label, colorOf }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <div className="chart-tip-title">{label}</div>
      {payload.map((p) => (
        <div key={`${p.dataKey}-${p.name}`} className="chart-tip-row">
          <span className="stat-dot" style={{ background: colorOf ? colorOf(label) : p.color }} aria-hidden="true" />
          <span className="chart-tip-name">{String(p.name)}</span>
          <span className="chart-tip-value num">{fmtNum(p.value)}</span>
        </div>
      ))}
    </div>
  );
}
