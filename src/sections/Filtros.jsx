import { Filter } from "lucide-react";
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

export default function Filtros({ conceptos, filtros, onCambiarFiltro }) {
  return (
    <div className="filters no-print reveal" style={{ "--i": 1 }}>
      <FilaChips etiqueta="Concepto" opciones={conceptos} valor={filtros.concepto}
        onCambio={(c) => onCambiarFiltro("concepto", c)} color={colorConcepto} />
      <FilaChips etiqueta="Mes" opciones={MESES} valor={filtros.mes}
        onCambio={(m) => onCambiarFiltro("mes", m)} />
    </div>
  );
}
