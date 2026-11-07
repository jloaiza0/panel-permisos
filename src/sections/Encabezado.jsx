import { FileSpreadsheet, Printer, RotateCcw } from "lucide-react";
import YearSelector from "../components/ui/YearSelector.jsx";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";
import { TODOS } from "../lib/estadisticas.js";

// Título, archivo cargado y barra de herramientas (año, PDF, otro archivo,
// modo oscuro). Al imprimir, la barra se oculta y en su lugar sale una
// línea con los filtros aplicados, para que el PDF diga qué muestra.
export default function Encabezado({ nombreArchivo, totalRegistros, anios, filtros, onCambiarFiltro, onReiniciar }) {
  const filtrosTexto = [
    `Año: ${filtros.anio}`,
    `Concepto: ${filtros.concepto}`,
    `Mes: ${filtros.mes}`,
  ].join(" · ");

  return (
    <header className="page-head reveal" style={{ "--i": 0 }}>
      <div className="page-head-text">
        <h1 className="page-title">Panel de ausentismo</h1>
        <p className="page-meta">
          <FileSpreadsheet size={14} aria-hidden="true" />
          <span className="page-meta-file" title={nombreArchivo}>{nombreArchivo}</span>
          <span aria-hidden="true">·</span>
          <span className="num">{totalRegistros.toLocaleString("es-CO")} registros</span>
        </p>
        <p className="page-meta print-only">{filtrosTexto}</p>
      </div>

      <div className="toolbar no-print">
        <YearSelector opciones={[TODOS, ...anios]} valor={filtros.anio} onCambio={(a) => onCambiarFiltro("anio", a)} />
        <span className="toolbar-sep" aria-hidden="true" />
        <button type="button" className="btn btn-primary" onClick={() => window.print()} title="Descargar como PDF">
          <Printer size={14} aria-hidden="true" /> Descargar PDF
        </button>
        <button type="button" className="btn" onClick={onReiniciar} title="Cargar otro archivo">
          <RotateCcw size={14} aria-hidden="true" /> Otro archivo
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
