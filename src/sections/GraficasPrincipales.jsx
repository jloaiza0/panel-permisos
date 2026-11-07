import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import Section from "../components/ui/Section.jsx";
import Grafica from "../components/charts/Grafica.jsx";
import ChartTooltip from "../components/charts/ChartTooltip.jsx";
import PeakLabel from "../components/charts/PeakLabel.jsx";
import { ANIM, AXIS_X, AXIS_Y, GRID_H, GRID_V, LABEL_DERECHA, TICK_INK, TOOLTIP_BAR } from "../components/charts/chartTheme.js";
import { SINGLE, colorConcepto } from "../constants/colores.js";
import { describir, recortar } from "../lib/formato.js";
import { TODOS } from "../lib/estadisticas.js";
import { useNarrow } from "../hooks/useNarrow.js";
import { orden } from "../components/ui/orden.js";

/** @typedef {import("../lib/estadisticas.js").ConteoMes} ConteoMes */

// Las tres gráficas que respetan TODOS los filtros de arriba:
// permisos por mes, por tipo de permiso y top 10 personas.
/**
 * @param {{
 *   filtros: Filtros,
 *   porMes: ConteoMes[],
 *   porConcepto: Array<{ concepto: string, cantidad: number }>,
 *   topPersonas: Array<{ nombre: string, cantidad: number }>,
 * }} props
 */
export default function GraficasPrincipales({ filtros, porMes, porConcepto, topPersonas }) {
  const narrow = useNarrow();
  const nombreMax = narrow ? 16 : 24; // caracteres visibles del nombre en el Top 10
  const maxMes = Math.max(0, ...porMes.map((x) => x.cantidad));
  const sufijoMes = filtros.mes === TODOS ? "" : ` — ${filtros.mes}`;

  return (
    <>
      <Section className="reveal" style={orden(3)} title="Permisos por mes"
        subtitle={filtros.anio === TODOS ? "Todos los años combinados" : `Año ${filtros.anio}`}>
        <Grafica height={260} descripcion={`Permisos por mes. ${describir(porMes, "mes", "cantidad")}`}>
          <BarChart data={porMes} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID_H} />
            <XAxis dataKey="mes" {...AXIS_X} />
            <YAxis {...AXIS_Y} />
            <Tooltip {...TOOLTIP_BAR} content={<ChartTooltip />} />
            <Bar {...ANIM} dataKey="cantidad" name="Permisos" fill={SINGLE} radius={[4, 4, 0, 0]} maxBarSize={24}>
              {/* Solo el mes pico lleva su número encima */}
              <LabelList dataKey="cantidad" content={<PeakLabel max={maxMes} />} />
            </Bar>
          </BarChart>
        </Grafica>
      </Section>

      <div className="grid-split reveal" style={orden(4)}>
        <Section title="Por tipo de permiso" subtitle={`Distribución de conceptos${sufijoMes}`}>
          <Grafica height={Math.max(180, porConcepto.length * 44 + 24)}
            descripcion={`Permisos por tipo. ${describir(porConcepto, "concepto", "cantidad")}`}>
            <BarChart data={porConcepto} layout="vertical" margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_V} />
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis dataKey="concepto" type="category" width={116} tick={TICK_INK} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_BAR} content={<ChartTooltip colorOf={colorConcepto} />} />
              <Bar {...ANIM} dataKey="cantidad" name="Permisos" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {porConcepto.map((e) => <Cell key={e.concepto} fill={colorConcepto(e.concepto)} />)}
                <LabelList dataKey="cantidad" {...LABEL_DERECHA} />
              </Bar>
            </BarChart>
          </Grafica>
        </Section>

        <Section title="Top 10 personas" subtitle={`Mayor número de permisos${sufijoMes}`}>
          <Grafica height={Math.max(180, topPersonas.length * 30 + 24)}
            descripcion={`Personas con más permisos. ${describir(topPersonas, "nombre", "cantidad")}`}>
            <BarChart data={topPersonas} layout="vertical" margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_V} />
              <XAxis type="number" hide allowDecimals={false} />
              {/* interval={0} muestra los 10 nombres; los muy largos se
                  recortan (el nombre completo sale en el tooltip). */}
              <YAxis dataKey="nombre" type="category" width={narrow ? 120 : 200} interval={0}
                tick={{ ...TICK_INK, width: 400 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => recortar(String(v), nombreMax)} />
              <Tooltip {...TOOLTIP_BAR} content={<ChartTooltip />} />
              <Bar {...ANIM} dataKey="cantidad" name="Permisos" fill={SINGLE} radius={[0, 4, 4, 0]} maxBarSize={18}>
                <LabelList dataKey="cantidad" {...LABEL_DERECHA} />
              </Bar>
            </BarChart>
          </Grafica>
        </Section>
      </div>
    </>
  );
}
