import { useDeferredValue, useMemo, useState } from "react";
import { Search } from "lucide-react";
import Section from "../components/ui/Section.jsx";
import { colorConcepto } from "../constants/colores.js";
import { fmtFecha, fmtHoras } from "../lib/formato.js";
import { buscarPorNombre } from "../lib/estadisticas.js";

// Máximo de filas que se dibujan a la vez. Con un Excel grande, escribir
// una sola letra encontraría miles de registros y congelaría la página.
const LIMITE_FILAS = 200;

// Buscador por nombre con tabla de historial. Respeta los filtros de arriba
// y no distingue tildes ni mayúsculas ("jose" encuentra a "José").
export default function ConsultaPersona({ registros }) {
  const [busqueda, setBusqueda] = useState("");
  // useDeferredValue: la caja de texto responde al instante y la búsqueda
  // se calcula justo después, sin trabar la escritura.
  const texto = useDeferredValue(busqueda);
  const resultados = useMemo(() => buscarPorNombre(registros, texto), [registros, texto]);
  const visibles = resultados.slice(0, LIMITE_FILAS);
  const hayTexto = texto.trim() !== "";

  return (
    <Section title="Consulta por persona" subtitle="Escribe un nombre para ver su historial en el período seleccionado">
      <label className="search no-print">
        <Search size={16} aria-hidden="true" />
        <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Ej: Yeni An Galeano" aria-label="Buscar por nombre" autoComplete="off" />
      </label>

      {/* Tres estados: sin texto → nada; sin resultados → mensaje; con resultados → tabla */}
      {hayTexto && (resultados.length === 0 ? (
        <p className="empty-note" role="status">
          No hay registros para “{texto.trim()}” con los filtros actuales. Revisa la ortografía o cambia el año, concepto o mes.
        </p>
      ) : (
        <>
          <p className="empty-note num results-count" role="status">
            {resultados.length > LIMITE_FILAS
              ? `Mostrando los ${LIMITE_FILAS} más recientes de ${resultados.length.toLocaleString("es-CO")} registros. Escribe más del nombre para acotar.`
              : `${resultados.length.toLocaleString("es-CO")} ${resultados.length === 1 ? "registro" : "registros"}`}
          </p>
          <div className="table-wrap">
            <table className="table num">
              <caption className="sr-only">Historial de permisos que coinciden con “{texto.trim()}”</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Concepto</th>
                  <th scope="col" className="r">Horas</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap">{fmtFecha(r.fecha)}</td>
                    <td>{r.nombre}</td>
                    <td>
                      <span className="concept-tag">
                        <span className="chip-dot" style={{ background: colorConcepto(r.concepto) }} aria-hidden="true" />
                        {r.concepto}
                      </span>
                    </td>
                    <td className="r">{r.tiempoMin != null ? fmtHoras(r.tiempoMin) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ))}
    </Section>
  );
}
