import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import Section from "../components/ui/Section.jsx";
import MiniStat from "../components/ui/MiniStat.jsx";
import Grafica from "../components/charts/Grafica.jsx";
import ChartTooltip from "../components/charts/ChartTooltip.jsx";
import {
  ANIM, AXIS_X, AXIS_Y, GRID_H, LABEL_ARRIBA, LEGEND, TOOLTIP_BAR, TOOLTIP_LINE, puntos,
} from "../components/charts/chartTheme.js";
import { describir, fmtNum } from "../lib/formato.js";
import { mesPorAnio, totalesPorAnio } from "../lib/estadisticas.js";

// Texto para lectores de pantalla de una gráfica con una línea por año.
/**
 * @param {Array<Record<string | number, any>>} filas
 * @param {number[]} anios
 */
const describirLineas = (filas, anios) =>
  anios.map((a) => `${a}: ${filas.map((f) => `${f.mes} ${fmtNum(f[a])}`).join(", ")}`).join(". ");

// Líneas de una gráfica mes a mes: una por año.
/**
 * @param {number[]} anios
 * @param {(anio: number) => string} colorAnio
 */
const lineas = (anios, colorAnio) =>
  anios.map((a) => (
    <Line {...ANIM} {...puntos(colorAnio(a))} key={a} type="linear" dataKey={a} name={String(a)}
      stroke={colorAnio(a)} strokeWidth={2} />
  ));

// Comparativo entre años. Usa TODOS los registros a propósito (ignora los
// filtros de arriba): su función es comparar años entre sí.
/**
 * @param {{ datos: Registro[], anios: number[], colorAnio: (anio: number) => string }} props
 */
export default function ComparativoAnios({ datos, anios, colorAnio }) {
  // Por defecto compara los dos años más recientes.
  // (Esta sección solo se muestra con 2 años o más.)
  const [anioA, setAnioA] = useState(/** @type {number} */ (anios.at(-2)));
  const [anioB, setAnioB] = useState(/** @type {number} */ (anios.at(-1)));
  // Si eligen el mismo año en los dos lados, se dibuja una sola vez.
  const elegidos = anioA === anioB ? [anioA] : [anioA, anioB];

  const porAnio = useMemo(() => totalesPorAnio(datos), [datos]);
  const mesTodos = useMemo(() => mesPorAnio(datos, anios), [datos, anios]);
  const mesElegidos = useMemo(
    () => mesPorAnio(datos, anioA === anioB ? [anioA] : [anioA, anioB]),
    [datos, anioA, anioB]
  );
  const totales = (/** @type {number} */ a) => porAnio.find((x) => x.anio === a) ?? { cantidad: 0, horas: 0 };

  return (
    <Section className="fade-in" title="Comparativo entre años" subtitle="Todos los años, sin aplicar los filtros de arriba">
      {/* Dos medidas distintas = dos gráficas, nunca una con dos ejes. */}
      <div className="grid-split">
        {[["cantidad", "Permisos", "Total de permisos por año"], ["horas", "Horas", "Horas totales por año"]].map(([clave, nombre, titulo]) => (
          <Grafica key={clave} titulo={titulo} height={220} descripcion={`${titulo}. ${describir(porAnio, "anio", clave)}`}>
            <BarChart data={porAnio} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_H} />
              <XAxis dataKey="anio" {...AXIS_X} />
              <YAxis {...AXIS_Y} width={clave === "horas" ? 44 : 36} />
              <Tooltip {...TOOLTIP_BAR} content={<ChartTooltip colorOf={colorAnio} />} />
              <Bar {...ANIM} dataKey={clave} name={nombre} radius={[4, 4, 0, 0]} maxBarSize={48}>
                {porAnio.map((e) => <Cell key={e.anio} fill={colorAnio(e.anio)} />)}
                <LabelList dataKey={clave} {...LABEL_ARRIBA} />
              </Bar>
            </BarChart>
          </Grafica>
        ))}
      </div>

      <div className="section-block">
        <Grafica titulo="Permisos por mes, comparado entre años" height={280} descripcion={describirLineas(mesTodos, anios)}>
          <LineChart data={mesTodos} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID_H} />
            <XAxis dataKey="mes" {...AXIS_X} padding={{ left: 12, right: 12 }} />
            <YAxis {...AXIS_Y} />
            <Tooltip {...TOOLTIP_LINE} content={<ChartTooltip />} />
            <Legend {...LEGEND} />
            {lineas(anios, colorAnio)}
          </LineChart>
        </Grafica>
      </div>

      {/* Comparador manual: año A contra año B */}
      <div className="section-block section-divider">
        <div className="compare-bar no-print">
          <div className="sub-title">Comparar un año contra otro</div>
          <select className="field num" aria-label="Primer año" value={anioA} onChange={(e) => setAnioA(Number(e.target.value))}>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <span className="compare-vs">vs</span>
          <select className="field num" aria-label="Segundo año" value={anioB} onChange={(e) => setAnioB(Number(e.target.value))}>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <p className="sub-title print-only">Comparación {elegidos.join(" vs ")}</p>

        <div className="grid-stats">
          {elegidos.map((a) => <MiniStat key={`p${a}`} label={`Permisos ${a}`} value={totales(a).cantidad} color={colorAnio(a)} />)}
          {elegidos.map((a) => <MiniStat key={`h${a}`} label={`Horas ${a}`} value={totales(a).horas} color={colorAnio(a)} />)}
        </div>

        <Grafica height={260} descripcion={describirLineas(mesElegidos, elegidos)}>
          <LineChart data={mesElegidos} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID_H} />
            <XAxis dataKey="mes" {...AXIS_X} padding={{ left: 12, right: 12 }} />
            <YAxis {...AXIS_Y} />
            <Tooltip {...TOOLTIP_LINE} content={<ChartTooltip />} />
            <Legend {...LEGEND} />
            {lineas(elegidos, colorAnio)}
          </LineChart>
        </Grafica>
      </div>
    </Section>
  );
}
