// ============================================================================
// App.jsx
// ----------------------------------------------------------------------------
// El componente principal. Decide qué pantalla se ve:
//   - Sin Excel cargado → PantallaCarga (subir el archivo).
//   - Con Excel cargado → Dashboard (gráficas, filtros, tablas).
//
// Mapa del proyecto:
//   constants/   listas fijas (meses) y colores de las gráficas
//   lib/         lógica sin pantalla: lector de Excel, cálculos, formatos
//   hooks/       memoria y cálculos del dashboard (useDashboard, useNarrow)
//   components/  piezas reutilizables (ui/ y charts/) y la zona de carga
//   sections/    cada bloque visual del dashboard
//   styles/      estilos globales y tokens de diseño
// ============================================================================
import { lazy, Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import PantallaCarga from "./sections/PantallaCarga.jsx";

// El dashboard (y la librería de gráficas, que pesa bastante) se descarga
// aparte. PantallaCarga lo pide en segundo plano apenas se abre la página.
const cargarDashboard = () => import("./Dashboard.jsx");
const Dashboard = lazy(cargarDashboard);

export default function App() {
  // null = todavía no hay Excel; si no, { registros, nombre }.
  const [carga, setCarga] = useState(/** @type {{ registros: Registro[], nombre: string } | null} */ (null));

  if (!carga) {
    return (
      <PantallaCarga
        precargar={cargarDashboard}
        onDatosCargados={(registros, nombre) => setCarga({ registros, nombre })}
      />
    );
  }

  return (
    <Suspense fallback={<Cargando />}>
      <Dashboard datos={carga.registros} nombreArchivo={carga.nombre} onReiniciar={() => setCarga(null)} />
    </Suspense>
  );
}

function Cargando() {
  return (
    <main className="page page-center" aria-busy="true">
      <Loader2 size={28} className="spin brand-color" aria-label="Cargando panel" />
    </main>
  );
}
