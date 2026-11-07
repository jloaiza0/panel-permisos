import { useEffect, useRef } from "react";
import { FileSpreadsheet, Printer, RotateCcw } from "lucide-react";
import YearSelector from "../components/ui/YearSelector.jsx";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";
import { TODOS } from "../lib/estadisticas.js";
import { orden } from "../components/ui/orden.js";

// Título, archivo cargado y barra de herramientas (año, PDF, otro archivo,
// modo oscuro). Al imprimir, la barra se oculta y en su lugar sale una
// línea con los filtros aplicados, para que el PDF diga qué muestra.
/**
 * @param {{
 *   nombreArchivo: string,
 *   totalRegistros: number,
 *   anios: number[],
 *   filtros: Filtros,
 *   onCambiarFiltro: <K extends keyof Filtros>(campo: K, valor: Filtros[K]) => void,
 *   onReiniciar: () => void,
 * }} props
 */
export default function Encabezado({ nombreArchivo, totalRegistros, anios, filtros, onCambiarFiltro, onReiniciar }) {
  const filtrosTexto = [
    `Año: ${filtros.anio}`,
    `Concepto: ${filtros.concepto}`,
    `Mes: ${filtros.mes}`,
  ].join(" · ");

  // Al aparecer el dashboard, el foco pasa al título: el lector de pantalla
  // anuncia que cambió la página y la tecla Tab sigue desde aquí (y no
  // desde una zona de carga que ya no existe).
  const tituloRef = useRef(/** @type {HTMLHeadingElement | null} */ (null));
  useEffect(() => { tituloRef.current?.focus(); }, []);

  return (
    <header className="page-head reveal" style={orden(0)}>
      <div className="page-head-text">
        <h1 ref={tituloRef} tabIndex={-1} className="page-title">Panel de ausentismo</h1>
        {/* Enlace para saltar los filtros con el teclado (solo se ve al
            recibir foco). Va justo después del título: como el foco empieza
            en el título, es lo primero que se alcanza con Tab. */}
        <a className="skip-link" href="#resultados">Saltar a los resultados</a>
        <p className="page-meta">
          <FileSpreadsheet size={14} aria-hidden="true" />
          <span className="page-meta-file" title={nombreArchivo}>{nombreArchivo}</span>
          <span aria-hidden="true">·</span>
          <span className="num">{totalRegistros.toLocaleString("es-CO")} registros</span>
        </p>
        <p className="page-meta print-only">{filtrosTexto}</p>
      </div>

      <div className="toolbar no-print">
        <YearSelector opciones={[TODOS, ...anios]} valor={filtros.anio} onCambio={(a) => onCambiarFiltro("anio", a === TODOS ? TODOS : Number(a))} />
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
