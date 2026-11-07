import { Filter, X } from "lucide-react";
import { MESES } from "../constants/meses.js";
import { colorConcepto } from "../constants/colores.js";
import { TODOS } from "../lib/estadisticas.js";

// Una fila de botones tipo "chip". aria-pressed le dice al lector de
// pantalla cuál está activo, y el CSS usa ese mismo atributo para pintarlo.
function FilaChips({ etiqueta, opciones, valor, onCambio, color }) {
  return (
    <div className="filter-row" role="group" aria-label={`Filtrar por ${etiqueta.toLowerCase()}`}>
      <span className="filter-label"><Filter size={14} aria-hidden="true" /> {etiqueta}</span>
      {[TODOS, ...opciones].map((o) => (
        <button key={o} type="button" className="chip" aria-pressed={valor === o} onClick={() => onCambio(o)}>
          {/* El puntito de color hace que el filtro sirva de leyenda. */}
          {color && o !== TODOS && <span className="chip-dot" style={{ background: color(o) }} aria-hidden="true" />}
          {o}
        </button>
      ))}
    </div>
  );
}

// Filtros de concepto y mes, y una línea que dice cuántos permisos quedan.
// Esa línea es role="status": el lector de pantalla la anuncia al cambiar
// un filtro, así quien no ve las gráficas sabe que el contenido cambió.
export default function Filtros({ conceptos, filtros, onCambiarFiltro, visibles, total, onLimpiar }) {
  const hayFiltros = Object.values(filtros).some((v) => v !== TODOS);
  return (
    <div className="filters no-print reveal" style={{ "--i": 1 }}>
      <FilaChips etiqueta="Concepto" opciones={conceptos} valor={filtros.concepto}
        onCambio={(c) => onCambiarFiltro("concepto", c)} color={colorConcepto} />
      <FilaChips etiqueta="Mes" opciones={MESES} valor={filtros.mes}
        onCambio={(m) => onCambiarFiltro("mes", m)} />
      <div className="filter-summary">
        <p role="status" className="num">
          Mostrando <strong>{visibles.toLocaleString("es-CO")}</strong> de {total.toLocaleString("es-CO")} permisos
        </p>
        {hayFiltros && (
          <button type="button" className="btn btn-ghost" onClick={onLimpiar}>
            <X size={14} aria-hidden="true" /> Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
