import { SearchX } from "lucide-react";
import { TODOS } from "../lib/estadisticas.js";

// Si los filtros no dejan ningún registro, en vez de gráficas vacías se
// explica qué pasó y se ofrece quitar los filtros.
export default function SinResultados({ filtros, onLimpiar }) {
  const { anio, concepto, mes } = filtros;
  const periodo = [mes !== TODOS && mes, anio !== TODOS && anio].filter(Boolean).join(" ");
  return (
    <section className="card empty-state fade-in" role="status">
      <span className="empty-icon" aria-hidden="true"><SearchX size={22} /></span>
      <h2 className="card-title">No hay permisos con estos filtros</h2>
      <p className="card-subtitle empty-text">
        No hay registros{concepto !== TODOS && ` de ${concepto}`}{periodo && ` en ${periodo}`}.
        {" "}Prueba con otro mes o concepto.
      </p>
      <button type="button" className="btn empty-action" onClick={onLimpiar}>
        Quitar filtros de concepto y mes
      </button>
    </section>
  );
}
