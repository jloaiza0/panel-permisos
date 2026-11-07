// ============================================================================
// Dashboard.jsx
// ----------------------------------------------------------------------------
// El dashboard completo, una vez cargado el Excel. Solo arma el layout: la
// memoria y los cálculos vienen de hooks/useDashboard.js, y cada bloque
// visual vive en su propio archivo dentro de sections/.
//
// Se carga aparte (ver App.jsx): la pantalla inicial no necesita la
// librería de gráficas, así abre más rápido.
// ============================================================================
import { useCallback } from "react";
import { useDashboard } from "./hooks/useDashboard.js";
import { colorDeAnio } from "./constants/colores.js";
import { TODOS } from "./lib/estadisticas.js";
import Encabezado from "./sections/Encabezado.jsx";
import Filtros from "./sections/Filtros.jsx";
import ResumenKpis from "./sections/ResumenKpis.jsx";
import SinResultados from "./sections/SinResultados.jsx";
import GraficasPrincipales from "./sections/GraficasPrincipales.jsx";
import ComparativoAnios from "./sections/ComparativoAnios.jsx";
import ResumenPersona from "./sections/ResumenPersona.jsx";
import ConsultaPersona from "./sections/ConsultaPersona.jsx";
import PiePagina from "./components/ui/PiePagina.jsx";

/**
 * @param {{ datos: Registro[], nombreArchivo: string, onReiniciar: () => void }} props
 */
export default function Dashboard({ datos, nombreArchivo, onReiniciar }) {
  const d = useDashboard(datos);
  const { filtros, cambiarFiltro, anios } = d;
  const colorAnio = useCallback((/** @type {number} */ a) => colorDeAnio(anios, a), [anios]);

  // El estado vacío solo ofrece quitar concepto y mes (el año se ve arriba).
  const quitarConceptoYMes = () => {
    cambiarFiltro("concepto", TODOS);
    cambiarFiltro("mes", TODOS);
  };

  return (
    <div className="page">
      <main className="dashboard">
        <Encabezado nombreArchivo={nombreArchivo} totalRegistros={datos.length} anios={anios}
          filtros={filtros} onCambiarFiltro={cambiarFiltro} onReiniciar={onReiniciar} />

        <Filtros conceptos={d.conceptos} filtros={filtros} onCambiarFiltro={cambiarFiltro}
          visibles={d.filtrado.length} total={datos.length} onLimpiar={d.limpiarFiltros} />

        <ResumenKpis kpis={d.kpis} kpisPrev={d.kpisPrev} />

        {d.filtrado.length === 0 ? (
          <SinResultados filtros={filtros} onLimpiar={quitarConceptoYMes} />
        ) : (
          <GraficasPrincipales filtros={filtros} porMes={d.porMes} porConcepto={d.porConcepto} topPersonas={d.topPersonas} />
        )}

        {/* El comparativo solo tiene sentido sin año elegido y con 2+ años */}
        {filtros.anio === TODOS && anios.length > 1 && (
          <ComparativoAnios datos={datos} anios={anios} colorAnio={colorAnio} />
        )}

        <ResumenPersona datos={datos} personas={d.personas} filtros={filtros} />

        <ConsultaPersona registros={d.filtrado} />
      </main>
      <PiePagina />
    </div>
  );
}
