import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import Section from "../components/ui/Section.jsx";
import MiniStat from "../components/ui/MiniStat.jsx";
import Grafica from "../components/charts/Grafica.jsx";
import ChartTooltip from "../components/charts/ChartTooltip.jsx";
import {
  ANIM, AXIS_X, AXIS_Y, GRID_H, GRID_V, LABEL_ARRIBA, LABEL_DERECHA, TICK_INK, TOOLTIP_BAR,
} from "../components/charts/chartTheme.js";
import { SINGLE, colorConcepto } from "../constants/colores.js";
import { describir } from "../lib/formato.js";
import { TODOS, resumenPersona } from "../lib/estadisticas.js";

// Permisos de una persona elegida en el desplegable. Respeta los filtros de
// año y concepto: sin año elegido desglosa por año; con año, por mes.
/**
 * @param {{ datos: Registro[], personas: string[], filtros: Filtros }} props
 */
export default function ResumenPersona({ datos, personas, filtros }) {
  const [persona, setPersona] = useState("");
  const { anio, concepto } = filtros;
  const resumen = useMemo(
    () => (persona ? resumenPersona(datos, persona, { anio, concepto }) : null),
    [datos, persona, anio, concepto]
  );
  const porAnio = anio === TODOS;
  const etiqueta = porAnio ? "anio" : "mes";

  return (
    <Section title="Resumen por persona"
      subtitle={porAnio ? "Todos los años combinados" : `Desglosado por mes — año ${anio}`}>
      <select className="field field-wide no-print" aria-label="Persona" value={persona} onChange={(e) => setPersona(e.target.value)}>
        <option value="">Selecciona una persona</option>
        {personas.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      {persona && <p className="sub-title print-only">{persona}</p>}

      {!resumen && (
        <p className="empty-note">Elige una persona para ver sus permisos y horas por {porAnio ? "año" : "mes"} y por tipo.</p>
      )}

      {/* key={persona}: al cambiar de persona el bloque hace un fundido corto */}
      {resumen && (
        <div key={persona} className="fade-in">
          <div className="grid-stats">
            <MiniStat label="Total permisos" value={resumen.total} />
            <MiniStat label="Total horas" value={resumen.totalHoras} />
          </div>

          {resumen.total === 0 ? (
            <p className="empty-note">Esta persona no tiene permisos con los filtros actuales.</p>
          ) : (
            <div className="grid-split">
              <Grafica titulo={porAnio ? "Permisos por año" : "Permisos por mes"} height={220}
                descripcion={describir(resumen.porPeriodo, etiqueta, "cantidad")}>
                <BarChart data={/** @type {any[]} */ (resumen.porPeriodo)} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRID_H} />
                  <XAxis dataKey={etiqueta} {...AXIS_X} />
                  <YAxis {...AXIS_Y} />
                  <Tooltip {...TOOLTIP_BAR} content={<ChartTooltip />} />
                  <Bar {...ANIM} dataKey="cantidad" name="Permisos" fill={SINGLE} radius={[4, 4, 0, 0]} maxBarSize={porAnio ? 40 : 20}>
                    {porAnio && <LabelList dataKey="cantidad" {...LABEL_ARRIBA} />}
                  </Bar>
                </BarChart>
              </Grafica>

              <Grafica titulo="Por tipo de permiso" height={Math.max(180, resumen.porConcepto.length * 40 + 24)}
                descripcion={describir(resumen.porConcepto, "concepto", "cantidad")}>
                <BarChart data={resumen.porConcepto} layout="vertical" margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRID_V} />
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis dataKey="concepto" type="category" width={116} tick={TICK_INK} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_BAR} content={<ChartTooltip colorOf={colorConcepto} />} />
                  <Bar {...ANIM} dataKey="cantidad" name="Permisos" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {resumen.porConcepto.map((e) => <Cell key={e.concepto} fill={colorConcepto(e.concepto)} />)}
                    <LabelList dataKey="cantidad" {...LABEL_DERECHA} />
                  </Bar>
                </BarChart>
              </Grafica>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
