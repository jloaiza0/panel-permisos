import { ArrowDownRight, ArrowUpRight } from "lucide-react";

// Tarjeta grande de indicador (Total permisos, Horas totales, etc.).
// "delta" (opcional) = variación contra el año anterior. Más permisos u
// horas es PEOR (más ausentismo): subir se marca en rojo y bajar en verde,
// siempre con flecha + texto, nunca solo con color.
export default function KpiCard({ icon, label, value, delta }) {
  const sube = delta && delta.pct > 0.05;
  const baja = delta && delta.pct < -0.05;
  const tendencia = sube ? "up" : baja ? "down" : "flat";
  return (
    <div className="card kpi">
      <div className="kpi-label">
        <span aria-hidden="true" className="kpi-icon">{icon}</span>
        {label}
      </div>
      {/* key={value}: al cambiar el número se crea un <span> nuevo y la
          animación "swap" vuelve a correr. */}
      <div className="kpi-value num"><span key={value} className="swap">{value}</span></div>
      {delta && (
        <div key={`${value}|${delta.anio}`} className="kpi-delta swap" data-trend={tendencia}>
          {sube && <ArrowUpRight size={14} aria-hidden="true" />}
          {baja && <ArrowDownRight size={14} aria-hidden="true" />}
          <span className="num">
            {sube ? "+" : ""}{delta.pct.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %
          </span>
          <span className="kpi-delta-ref">vs {delta.anio}</span>
        </div>
      )}
    </div>
  );
}
