import { Clock, FileText, TrendingUp, Users } from "lucide-react";
import KpiCard from "../components/ui/KpiCard.jsx";
import { variacion } from "../lib/estadisticas.js";

// Las 4 tarjetas de indicadores. Si hay un año elegido y el Excel trae el
// año anterior, cada una muestra su variación ("+12 % vs 2024").
export default function ResumenKpis({ kpis, kpisPrev }) {
  const delta = (clave) => {
    const pct = kpisPrev && variacion(kpis[clave], kpisPrev[clave]);
    return pct == null ? null : { pct, anio: kpisPrev.anio };
  };
  const fmt = (n, decimales = 0) => n.toLocaleString("es-CO", { maximumFractionDigits: decimales });

  return (
    // id="resultados": destino del enlace "Saltar a los resultados".
    // tabIndex={-1} permite que reciba el foco al saltar.
    <div id="resultados" tabIndex={-1} className="grid-kpi reveal" style={{ "--i": 2 }}>
      <KpiCard icon={<FileText size={16} />} label="Total permisos" value={fmt(kpis.totalPermisos)} delta={delta("totalPermisos")} />
      <KpiCard icon={<Clock size={16} />} label="Horas totales" value={fmt(kpis.totalHoras)} delta={delta("totalHoras")} />
      <KpiCard icon={<Users size={16} />} label="Personas con permisos" value={fmt(kpis.personas)} delta={delta("personas")} />
      <KpiCard icon={<TrendingUp size={16} />} label="Promedio por persona" value={fmt(kpis.promedio, 1)} delta={delta("promedio")} />
    </div>
  );
}
