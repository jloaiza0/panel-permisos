// ============================================================================
// App.jsx
// ----------------------------------------------------------------------------
// ¿PARA QUÉ SIRVE ESTE ARCHIVO?
//
// Es el componente PRINCIPAL de toda la aplicación. Aquí vive:
//   1. Todo el "estado" (la memoria) de la app: qué archivo hay cargado,
//      qué filtros están activos, qué persona se seleccionó, etc.
//   2. Todos los CÁLCULOS: a partir de los datos crudos del Excel, arma
//      los números y listas que alimentan cada gráfica (KPIs, top 10
//      personas, comparación entre años, etc.)
//   3. Todo el DIBUJO en pantalla: el layout completo del dashboard.
//
// Es el archivo más grande del proyecto porque es literalmente donde vive
// el dashboard completo. Está dividido aquí abajo en partes con títulos
// para que puedas ubicarte:
//
//   PARTE 1 — Datos fijos y funciones pequeñas (arriba del todo)
//   PARTE 2 — Estado (la "memoria" de la app)
//   PARTE 3 — Funciones que cambian el estado (cargar archivo, reiniciar...)
//   PARTE 4 — Cálculos derivados de los datos (useMemo)
//   PARTE 5 — Qué se dibuja en pantalla (el "return" con todo el JSX)
//   PARTE 6 — Componentes pequeños reutilizables (MiniStat, KpiCard, Section)
// ============================================================================

import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts"; // librería de terceros que dibuja las gráficas de barras
import { Clock, Users, FileText, TrendingUp, Search, RotateCcw, Printer, Filter } from "lucide-react"; // iconos
import FileUploader from "./components/FileUploader";


// ----------------------------------------------------------------------------
// PARTE 1: Datos fijos y funciones pequeñas
// ----------------------------------------------------------------------------

// Lista de meses en el orden correcto. Se usa en varias gráficas para que
// siempre aparezcan de Enero a Diciembre, aunque el Excel no tenga datos
// en todos los meses (por eso NO sacamos esta lista de los datos: la
// tenemos fija de antemano).
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// Le asigna un color fijo a cada tipo de permiso, para que en TODAS las
// gráficas "CITA MÉDICA" sea siempre verde, "PERSONAL" siempre azul, etc.
// Si no hiciéramos esto, cada gráfica podría asignar colores en un orden
// distinto y sería confuso comparar una gráfica con otra.
const CONCEPT_COLORS = {
  "CITA MÉDICA": "#0F6E56",
  "PERSONAL": "#378ADD",
  "ESTUDIO": "#BA7517",
  "COMPENSATORIO": "#D85A30",
  "C VOTACION": "#7F77DD",
};
// Color de respaldo por si aparece un concepto nuevo que no está en la
// lista de arriba (por ejemplo, si algún día agregan un tipo de permiso
// nuevo en el Excel).
const FALLBACK_COLOR = "#888780";

// Convierte minutos a horas para mostrar en pantalla, con hasta 1 decimal
// (pero sin decimal si es un número redondo). Ejemplo: 480 minutos → "8",
// 450 minutos → "7.5".
function fmtHoras(min) {
  const h = min / 60;
  return h % 1 === 0 ? `${h}` : h.toFixed(1);
}


export default function App() {

  // --------------------------------------------------------------------
  // PARTE 2: Estado — la "memoria" de la app
  // --------------------------------------------------------------------
  // Cada useState es un dato que, cuando cambia, hace que React vuelva a
  // dibujar la pantalla automáticamente con el valor nuevo.

  const [datos, setDatos] = useState(null);            // la lista completa de permisos (null = todavía no se ha subido ningún Excel)
  const [nombreArchivo, setNombreArchivo] = useState(""); // nombre del archivo subido, para mostrarlo en el encabezado
  const [anioSel, setAnioSel] = useState("Todos");      // año elegido en el filtro de arriba ("Todos" o un año específico)
  const [conceptoSel, setConceptoSel] = useState("Todos"); // concepto elegido en el filtro ("Todos", "PERSONAL", etc.)
  const [mesSel, setMesSel] = useState("Todos");        // mes elegido en el filtro
  const [busqueda, setBusqueda] = useState("");         // texto escrito en la caja de "Consulta por persona"

  // Estos dos son para el comparador "año A vs año B" (más abajo en el
  // dashboard). Están declarados aparte porque dependen de calcularse
  // DESPUÉS de conocer qué años trae el Excel — se inicializan dentro de
  // handleDatosCargados, no aquí arriba con un valor fijo.
  const [anioA, setAnioA] = useState(null);
  const [anioB, setAnioB] = useState(null);

  // Persona elegida en el desplegable de "Resumen por persona".
  const [personaSel, setPersonaSel] = useState("");


  // --------------------------------------------------------------------
  // PARTE 3: Funciones que cambian el estado
  // --------------------------------------------------------------------

  // Se ejecuta cuando FileUploader.jsx termina de leer el Excel con
  // éxito. Recibe la lista de registros ya procesados y el nombre del
  // archivo, y los guarda en el estado. También reinicia todos los
  // filtros a "Todos" (por si venías de un archivo anterior con otros
  // filtros aplicados) y elige automáticamente los dos últimos años
  // disponibles para el comparador A vs B.
  function handleDatosCargados(registros, nombreArchivo) {
    setDatos(registros);
    setNombreArchivo(nombreArchivo);
    setAnioSel("Todos");
    setConceptoSel("Todos");
    setMesSel("Todos");

    const anios = Array.from(new Set(registros.map(r => r.anio))).sort();
    // "anios[anios.length - 2]" es el penúltimo año de la lista (el
    // anterior al más reciente). El "?? anios[0] ?? null" es un plan B
    // por si solo hay un año disponible: en ese caso usa el único que
    // haya, y si ni eso hay, deja null.
    setAnioA(anios[anios.length - 2] ?? anios[0] ?? null);
    setAnioB(anios[anios.length - 1] ?? null); // el año más reciente
  }

  // Botón "Otro archivo": borra todo y vuelve a la pantalla inicial de
  // subir un Excel.
  function reiniciar() {
    setDatos(null);
    setNombreArchivo("");
    setBusqueda("");
  }

  // Botón "Descargar PDF": usa la función de imprimir del propio
  // navegador. Junto con las reglas de impresión del CSS (que ocultan
  // los botones y filtros al imprimir), esto genera un PDF limpio de lo
  // que se está viendo en pantalla en ese momento.
  function descargarPDF() {
    window.print();
  }


  // --------------------------------------------------------------------
  // PARTE 4: Cálculos derivados de los datos (useMemo)
  // --------------------------------------------------------------------
  // "useMemo" significa: "calcula esto, pero solo vuelve a calcularlo si
  // alguno de los datos de la listita [entre corchetes] cambió". Sin
  // useMemo, estos cálculos se repetirían en CADA repintado de pantalla,
  // aunque nada relevante haya cambiado — con datasets grandes eso
  // volvería la app lenta. Es una optimización de rendimiento.

  // Lista de años distintos que aparecen en el Excel (para dibujar los
  // botones de filtro "2024", "2025", etc.)
  const anios = useMemo(
    () => (datos ? Array.from(new Set(datos.map(r => r.anio))).sort() : []),
    [datos]
  );

  // "filtrado" es LA lista más importante de todo el archivo: son los
  // registros que quedan después de aplicar los TRES filtros de arriba
  // (año + concepto + mes) al mismo tiempo. Casi todas las gráficas del
  // dashboard principal se calculan a partir de esta lista, no de
  // "datos" directamente — así, cuando cambias un filtro, todo se
  // actualiza junto.
  const filtrado = useMemo(() => {
    if (!datos) return [];
    return datos.filter(r =>
      (anioSel === "Todos" || r.anio === anioSel) &&
      (conceptoSel === "Todos" || r.concepto === conceptoSel) &&
      (mesSel === "Todos" || r.mes === mesSel)
    );
  }, [datos, anioSel, conceptoSel, mesSel]);

  // Lista de conceptos distintos (para los botones del filtro "Concepto:")
  const conceptosDisponibles = useMemo(
    () => (datos ? Array.from(new Set(datos.map(r => r.concepto))).sort() : []),
    [datos]
  );

  // Los 4 números grandes de arriba del dashboard (KPIs = "indicadores
  // clave"). Todos se calculan sobre "filtrado", así que respetan los
  // filtros activos.
  const kpis = useMemo(() => {
    const totalPermisos = filtrado.length;
    const totalMin = filtrado.reduce((s, r) => s + (r.tiempoMin || 0), 0); // suma de todos los minutos
    const personas = new Set(filtrado.map(r => r.nombre)).size; // Set elimina nombres repetidos, .size cuenta cuántos distintos hay
    const promedio = personas ? totalPermisos / personas : 0;
    return { totalPermisos, totalHoras: totalMin / 60, personas, promedio };
  }, [filtrado]);

  // Datos para la gráfica "Permisos por mes": cuenta cuántos permisos
  // hay en cada uno de los 12 meses. Empezamos creando un "mapa" con
  // los 12 meses en cero, y luego vamos sumando 1 por cada registro que
  // encontremos de ese mes — así, aunque un mes no tenga ningún permiso,
  // igual aparece en la gráfica con la barra en cero (en vez de
  // desaparecer).
  const porMes = useMemo(() => {
    const map = {};
    MESES.forEach(m => { map[m] = { mes: m, cantidad: 0 }; });
    filtrado.forEach(r => { if (map[r.mes]) map[r.mes].cantidad += 1; });
    return MESES.map(m => map[m]); // lo convertimos de mapa a lista, en el orden correcto de los meses
  }, [filtrado]);

  // Datos para la gráfica "Por tipo de permiso": cuenta cuántos permisos
  // hay de cada concepto, y los ordena de mayor a menor cantidad.
  const porConcepto = useMemo(() => {
    const map = {};
    filtrado.forEach(r => {
      const c = r.concepto || "Sin dato";
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map) // convierte {PERSONAL: 5, ESTUDIO: 3} en [["PERSONAL",5],["ESTUDIO",3]]
      .map(([concepto, cantidad]) => ({ concepto, cantidad })) // y esto lo vuelve a convertir en objetos {concepto, cantidad}
      .sort((a, b) => b.cantidad - a.cantidad); // de mayor a menor
  }, [filtrado]);

  // Datos para "Top 10 personas": cuenta permisos por persona, ordena de
  // mayor a menor, y se queda solo con las primeras 10 (.slice(0, 10)).
  const topPersonas = useMemo(() => {
    const map = {};
    filtrado.forEach(r => { map[r.nombre] = (map[r.nombre] || 0) + 1; });
    return Object.entries(map)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  }, [filtrado]);

  // Colores para distinguir cada año en las gráficas comparativas.
  const ANIO_COLORS = ["#0F6E56", "#D85A30", "#378ADD", "#BA7517", "#7F77DD"];

  // --- A partir de aquí: la sección "Comparativo entre años" ---
  // IMPORTANTE: estos cálculos usan "datos" (TODOS los registros), no
  // "filtrado". Es decir, esta sección ignora a propósito los filtros de
  // año/concepto/mes de arriba, porque su función es comparar años entre
  // sí — no tendría sentido que un filtro de año la limitara.

  // Total de permisos y horas, agrupados por año.
  const porAnio = useMemo(() => {
    if (!datos) return [];
    const map = {};
    datos.forEach(r => {
      if (!map[r.anio]) map[r.anio] = { anio: r.anio, cantidad: 0, minutos: 0 };
      map[r.anio].cantidad += 1;
      map[r.anio].minutos += r.tiempoMin || 0;
    });
    return Object.values(map)
      .map(x => ({ ...x, horas: Number((x.minutos / 60).toFixed(1)) })) // "...x" copia todo lo que ya tenía x, y le agregamos "horas"
      .sort((a, b) => a.anio - b.anio); // ordenado del año más viejo al más nuevo
  }, [datos]);

  // Igual que "porMes" de arriba, pero separando los conteos por año.
  // El resultado es algo como:
  //   { mes: "Ene", 2024: 5, 2025: 8, 2026: 3 }
  // que es justo la forma que necesita Recharts para dibujar varias
  // barras (una por año) agrupadas bajo cada mes.
  const mesPorAnio = useMemo(() => {
    if (!datos) return [];
    const anios = Array.from(new Set(datos.map(r => r.anio))).sort();
    const map = {};
    MESES.forEach(m => { map[m] = { mes: m }; anios.forEach(a => { map[m][a] = 0; }); });
    datos.forEach(r => {
      if (map[r.mes]) map[r.mes][r.anio] = (map[r.mes][r.anio] || 0) + 1;
    });
    return MESES.map(m => map[m]);
  }, [datos]);

  // Lista de años disponibles para comparar (usada también para dibujar
  // dinámicamente una <Bar> por cada año en la gráfica de arriba).
  const aniosComparables = useMemo(
    () => (datos ? Array.from(new Set(datos.map(r => r.anio))).sort() : []),
    [datos]
  );

  // --- Comparador "año A vs año B" (los dos <select> del dashboard) ---

  // Igual que mesPorAnio, pero solo con los dos años elegidos (anioA y
  // anioB), no con todos.
  const mesAvsB = useMemo(() => {
    if (!datos || anioA == null || anioB == null) return [];
    const map = {};
    MESES.forEach(m => { map[m] = { mes: m, [anioA]: 0, [anioB]: 0 }; });
    datos.forEach(r => {
      if (r.anio === anioA || r.anio === anioB) {
        if (map[r.mes]) map[r.mes][r.anio] = (map[r.mes][r.anio] || 0) + 1;
      }
    });
    return MESES.map(m => map[m]);
  }, [datos, anioA, anioB]);

  // Totales (cantidad y horas) de cada uno de los dos años elegidos, para
  // las 4 tarjetitas "Permisos 2024 / Permisos 2025 / Horas 2024 / Horas
  // 2025" que aparecen arriba de esa gráfica comparativa.
  const resumenAvsB = useMemo(() => {
    if (!datos || anioA == null || anioB == null) return null;
    const calc = (anio) => {
      const regs = datos.filter(r => r.anio === anio);
      const minutos = regs.reduce((s, r) => s + (r.tiempoMin || 0), 0);
      return { cantidad: regs.length, horas: Number((minutos / 60).toFixed(1)) };
    };
    return { a: calc(anioA), b: calc(anioB) };
  }, [datos, anioA, anioB]);

  // --- Sección "Resumen por persona" ---

  // Lista de nombres distintos, para llenar el desplegable de selección.
  const personasDisponibles = useMemo(
    () => (datos ? Array.from(new Set(datos.map(r => r.nombre))).sort() : []),
    [datos]
  );

  // Este es el cálculo más "inteligente" del archivo: cambia de
  // COMPORTAMIENTO según qué filtro de año esté activo.
  //
  //   - Si anioSel === "Todos" → arma un desglose POR AÑO (para ver la
  //     evolución de esa persona a través del tiempo).
  //   - Si hay un año específico elegido → arma un desglose POR MES,
  //     mostrando el detalle mes a mes de ese único año.
  //
  // Esto permite que la misma sección del dashboard sea útil tanto para
  // una vista general como para un análisis puntual de un año concreto.
  const resumenPersona = useMemo(() => {
    if (!datos || !personaSel) return null;

    // Función corta para aplicar también el filtro de concepto, si hay
    // uno activo.
    const conceptoMatch = (r) => conceptoSel === "Todos" || r.concepto === conceptoSel;

    if (anioSel === "Todos") {
      // ----- Modo "por año" -----
      const regs = datos.filter(r => r.nombre === personaSel && conceptoMatch(r));
      const anios = Array.from(new Set(regs.map(r => r.anio))).sort();

      const porAnioPersona = anios.map(a => {
        const regsAnio = regs.filter(r => r.anio === a);
        const minutos = regsAnio.reduce((s, r) => s + (r.tiempoMin || 0), 0);
        return { anio: a, cantidad: regsAnio.length, horas: Number((minutos / 60).toFixed(1)) };
      });

      const conceptoMap = {};
      regs.forEach(r => { conceptoMap[r.concepto] = (conceptoMap[r.concepto] || 0) + 1; });
      const porConceptoPersona = Object.entries(conceptoMap)
        .map(([concepto, cantidad]) => ({ concepto, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);

      const totalMin = regs.reduce((s, r) => s + (r.tiempoMin || 0), 0);
      return {
        modo: "anio", // esta bandera le dice a la parte visual qué gráfica dibujar
        total: regs.length,
        totalHoras: Number((totalMin / 60).toFixed(1)),
        porAnio: porAnioPersona,
        porConcepto: porConceptoPersona,
      };
    }

    // ----- Modo "por mes" (cuando hay un año específico elegido) -----
    const regs = datos.filter(r => r.nombre === personaSel && r.anio === anioSel && conceptoMatch(r));
    const mesMap = {};
    MESES.forEach(m => { mesMap[m] = { mes: m, cantidad: 0 }; });
    regs.forEach(r => { if (mesMap[r.mes]) mesMap[r.mes].cantidad += 1; });
    const porMesPersona = MESES.map(m => mesMap[m]);

    const conceptoMap = {};
    regs.forEach(r => { conceptoMap[r.concepto] = (conceptoMap[r.concepto] || 0) + 1; });
    const porConceptoPersona = Object.entries(conceptoMap)
      .map(([concepto, cantidad]) => ({ concepto, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const totalMin = regs.reduce((s, r) => s + (r.tiempoMin || 0), 0);
    return {
      modo: "mes",
      total: regs.length,
      totalHoras: Number((totalMin / 60).toFixed(1)),
      porMes: porMesPersona,
      porConcepto: porConceptoPersona,
    };
  }, [datos, personaSel, anioSel, conceptoSel]);

  // --- Sección "Consulta por persona" (la tabla de búsqueda por texto) ---
  // Filtra "filtrado" (respeta los filtros de arriba) por el texto escrito
  // en la caja de búsqueda, y ordena los resultados del más reciente al
  // más antiguo.
  const tablaBusqueda = useMemo(() => {
    if (!busqueda.trim()) return []; // si no hay texto escrito, no mostramos nada
    const q = busqueda.trim().toLowerCase();
    return filtrado
      .filter(r => r.nombre.toLowerCase().includes(q))
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1)); // orden descendente por fecha (más reciente primero)
  }, [filtrado, busqueda]);


  // --------------------------------------------------------------------
  // PARTE 5: Qué se dibuja en pantalla
  // --------------------------------------------------------------------

  // CASO A: todavía no se ha subido ningún Excel (datos === null).
  // En este caso, la pantalla ENTERA es solo el título y el FileUploader
  // — ni siquiera se intenta dibujar el dashboard, porque no hay datos
  // con qué hacerlo.
  if (!datos) {
    return (
      <div style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", background: "#F6F4EF", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 480, width: "100%" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, textAlign: "center", marginBottom: 8, color: "#1E2A38" }}>
            Panel de ausentismo
          </h1>
          <p style={{ textAlign: "center", color: "#6B6858", fontSize: 14, marginBottom: 24 }}>
            Selecciona el Excel de permisos para comenzar
          </p>
          <FileUploader onDatosCargados={handleDatosCargados} />
        </div>
      </div>
    );
  }

  // CASO B: ya hay datos cargados → se dibuja el dashboard completo.
  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", background: "#F6F4EF", minHeight: "100vh", width: "100%", padding: "32px 40px", color: "#1E2A38", boxSizing: "border-box" }}>
      <div style={{ width: "100%", margin: "0 auto" }}>

        {/* ---------- Encabezado: nombre del archivo, título, y botones ---------- */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 28, borderBottom: "1px solid #DAD6C8", paddingBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B6858", fontWeight: 600, marginBottom: 6 }}>
              {nombreArchivo}
            </div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 30, fontWeight: 700, margin: 0 }}>
              Panel de ausentismo
            </h1>
          </div>

          {/* className="no-print": estos botones NO deben salir en el PDF
              exportado (ver la regla @media print en index.css) */}
          <div className="no-print" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {/* Botones de filtro por año. El "..." (spread) mete "Todos"
                al principio de la lista de años reales. */}
            {["Todos", ...anios].map(a => (
              <button
                key={a}
                onClick={() => setAnioSel(a)}
                style={{
                  padding: "8px 14px", borderRadius: 6,
                  border: "1px solid " + (anioSel === a ? "#0F6E56" : "#DAD6C8"),
                  background: anioSel === a ? "#0F6E56" : "#FFFFFF", // resaltado verde si es el botón activo
                  color: anioSel === a ? "#FFFFFF" : "#1E2A38",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                {a}
              </button>
            ))}
            <button
              onClick={descargarPDF}
              title="Descargar como PDF"
              className="no-print"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 6, border: "1px solid #0F6E56", background: "#0F6E56", color: "#FFFFFF", fontSize: 13, cursor: "pointer" }}
            >
              <Printer size={14} /> Descargar PDF
            </button>
            <button
              onClick={reiniciar}
              title="Cargar otro archivo"
              className="no-print"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 6, border: "1px solid #DAD6C8", background: "#FFFFFF", color: "#6B6858", fontSize: 13, cursor: "pointer" }}
            >
              <RotateCcw size={14} /> Otro archivo
            </button>
          </div>
        </div>

        {/* ---------- Filtro de Concepto (mismo patrón de botones que el de año) ---------- */}
        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <Filter size={14} color="#6B6858" />
          <span style={{ fontSize: 13, color: "#6B6858", fontWeight: 600 }}>Concepto:</span>
          {["Todos", ...conceptosDisponibles].map(c => (
            <button
              key={c}
              onClick={() => setConceptoSel(c)}
              style={{
                padding: "6px 12px", borderRadius: 6,
                border: "1px solid " + (conceptoSel === c ? "#0F6E56" : "#DAD6C8"),
                background: conceptoSel === c ? "#0F6E56" : "#FFFFFF",
                color: conceptoSel === c ? "#FFFFFF" : "#1E2A38",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* ---------- Filtro de Mes (mismo patrón otra vez) ---------- */}
        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <Filter size={14} color="#6B6858" />
          <span style={{ fontSize: 13, color: "#6B6858", fontWeight: 600 }}>Mes:</span>
          {["Todos", ...MESES].map(m => (
            <button
              key={m}
              onClick={() => setMesSel(m)}
              style={{
                padding: "6px 12px", borderRadius: 6,
                border: "1px solid " + (mesSel === m ? "#0F6E56" : "#DAD6C8"),
                background: mesSel === m ? "#0F6E56" : "#FFFFFF",
                color: mesSel === m ? "#FFFFFF" : "#1E2A38",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* ---------- Las 4 tarjetas de KPI ---------- */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 32 }}>
          <KpiCard icon={<FileText size={18} />} label="Total permisos" value={kpis.totalPermisos.toLocaleString("es-CO")} />
          <KpiCard icon={<Clock size={18} />} label="Horas totales" value={kpis.totalHoras.toLocaleString("es-CO", { maximumFractionDigits: 0 })} />
          <KpiCard icon={<Users size={18} />} label="Personas con permisos" value={kpis.personas.toLocaleString("es-CO")} />
          <KpiCard icon={<TrendingUp size={18} />} label="Promedio por persona" value={kpis.promedio.toLocaleString("es-CO", { maximumFractionDigits: 1 })} />
        </div>

        {/* ---------- Gráfica: Permisos por mes ---------- */}
        <Section title="Permisos por mes" subtitle={anioSel === "Todos" ? "Todos los años combinados" : `Año ${anioSel}`}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porMes} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D5" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={{ stroke: "#DAD6C8" }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DAD6C8", fontSize: 13 }} formatter={(v) => [v, "Permisos"]} />
              <Bar dataKey="cantidad" fill="#0F6E56" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* ---------- Gráficas: Por tipo de permiso + Top 10 personas ---------- */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, marginTop: 24 }}>
          <Section title="Por tipo de permiso" subtitle={mesSel === "Todos" ? "Distribución de conceptos" : `Distribución de conceptos — ${mesSel}`}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={porConcepto} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="concepto" type="category" width={100} tick={{ fontSize: 12, fill: "#1E2A38" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DAD6C8", fontSize: 13 }} formatter={(v) => [v, "Permisos"]} />
                <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {/* Cada barra se pinta con el color que le corresponde a
                      su concepto, buscando en CONCEPT_COLORS (definido al
                      principio del archivo). */}
                  {porConcepto.map((entry, i) => (
                    <Cell key={i} fill={CONCEPT_COLORS[entry.concepto] || FALLBACK_COLOR} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>

          <Section title="Top 10 personas" subtitle={mesSel === "Todos" ? "Mayor número de permisos" : `Mayor número de permisos — ${mesSel}`}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topPersonas} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={false} tickLine={false} allowDecimals={false} />
                {/* interval={0} obliga a mostrar los 10 nombres, en vez de
                    que Recharts decida saltarse algunos por falta de
                    espacio. tickFormatter recorta nombres muy largos para
                    que no se encimen con la gráfica. */}
                <YAxis dataKey="nombre" type="category" width={200} interval={0} tick={{ fontSize: 12, fill: "#1E2A38" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v.length > 26 ? v.slice(0, 25) + "…" : v} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DAD6C8", fontSize: 13 }} formatter={(v) => [v, "Permisos"]} />
                <Bar dataKey="cantidad" fill="#D85A30" radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </div>

        {/* ---------- Sección "Comparativo entre años" ----------
            Solo se dibuja si: (1) el filtro de año está en "Todos" — no
            tendría sentido comparar años si ya filtraste a uno solo — y
            (2) el Excel realmente tiene más de un año de datos. */}
        {anioSel === "Todos" && aniosComparables.length > 1 && (
          <Section title="Comparativo entre años" subtitle="Todos los años, sin aplicar el filtro de arriba" style={{ marginTop: 24 }}>

            {/* Dos gráficas lado a lado: total de permisos por año, y horas por año */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6858", marginBottom: 8 }}>Total de permisos por año</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={porAnio} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D5" vertical={false} />
                    <XAxis dataKey="anio" tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={{ stroke: "#DAD6C8" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DAD6C8", fontSize: 13 }} formatter={(v) => [v, "Permisos"]} />
                    <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} maxBarSize={60}>
                      {porAnio.map((entry, i) => (
                        <Cell key={i} fill={ANIO_COLORS[i % ANIO_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6858", marginBottom: 8 }}>Horas totales por año</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={porAnio} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D5" vertical={false} />
                    <XAxis dataKey="anio" tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={{ stroke: "#DAD6C8" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DAD6C8", fontSize: 13 }} formatter={(v) => [v, "Horas"]} />
                    <Bar dataKey="horas" radius={[4, 4, 0, 0]} maxBarSize={60}>
                      {porAnio.map((entry, i) => (
                        <Cell key={i} fill={ANIO_COLORS[i % ANIO_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfica de barras agrupadas: un color por año, comparando
                mes a mes. aniosComparables.map(...) crea dinámicamente
                una <Bar> por cada año que exista en el Excel — así, si el
                año que viene aparece un 2027, la gráfica lo dibuja solo,
                sin tener que tocar el código. */}
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6858", marginBottom: 8 }}>Permisos por mes, comparado entre años</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={mesPorAnio} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D5" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={{ stroke: "#DAD6C8" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DAD6C8", fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {aniosComparables.map((a, i) => (
                    <Bar key={a} dataKey={a} name={String(a)} fill={ANIO_COLORS[i % ANIO_COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={22} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Comparador manual: dos <select> donde eliges año A y año B */}
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #E5E1D5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6858" }}>Comparar año específico contra otro</div>
                <select value={anioA ?? ""} onChange={(e) => setAnioA(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #DAD6C8", fontSize: 13, background: "#FFFFFF", color: "#1E2A38", colorScheme: "light" }}>
                  {aniosComparables.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <span style={{ color: "#6B6858", fontSize: 13 }}>vs</span>
                <select value={anioB ?? ""} onChange={(e) => setAnioB(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #DAD6C8", fontSize: 13, background: "#FFFFFF", color: "#1E2A38", colorScheme: "light" }}>
                  {aniosComparables.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              {resumenAvsB && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
                  <MiniStat label={`Permisos ${anioA}`} value={resumenAvsB.a.cantidad} color={ANIO_COLORS[0]} />
                  <MiniStat label={`Permisos ${anioB}`} value={resumenAvsB.b.cantidad} color={ANIO_COLORS[1]} />
                  <MiniStat label={`Horas ${anioA}`} value={resumenAvsB.a.horas} color={ANIO_COLORS[0]} />
                  <MiniStat label={`Horas ${anioB}`} value={resumenAvsB.b.horas} color={ANIO_COLORS[1]} />
                </div>
              )}

              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={mesAvsB} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D5" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={{ stroke: "#DAD6C8" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DAD6C8", fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {/* Cada <Bar> solo se dibuja si el año correspondiente
                      ya fue elegido (no es null) */}
                  {anioA != null && <Bar dataKey={anioA} name={String(anioA)} fill="#0F6E56" radius={[3, 3, 0, 0]} maxBarSize={26} />}
                  {anioB != null && <Bar dataKey={anioB} name={String(anioB)} fill="#D85A30" radius={[3, 3, 0, 0]} maxBarSize={26} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        )}

        {/* ---------- Sección "Resumen por persona" ----------
            El subtítulo y la gráfica de la izquierda cambian según el
            "modo" que calculó resumenPersona más arriba (PARTE 4). */}
        <Section
          title="Resumen por persona"
          subtitle={anioSel === "Todos" ? "Todos los años combinados" : `Desglosado por mes — año ${anioSel}`}
          style={{ marginTop: 24 }}
        >
          <select
            className="no-print"
            value={personaSel}
            onChange={(e) => setPersonaSel(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #DAD6C8", fontSize: 13, background: "#FFFFFF", color: "#1E2A38", colorScheme: "light", marginBottom: 16, minWidth: 240 }}
          >
            <option value="">— Selecciona una persona —</option>
            {personasDisponibles.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          {/* Todo lo de abajo solo se dibuja si ya se eligió una persona
              (resumenPersona no es null) */}
          {resumenPersona && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
                <MiniStat label="Total permisos" value={resumenPersona.total} color="#0F6E56" />
                <MiniStat label="Total horas" value={resumenPersona.totalHoras} color="#0F6E56" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6858", marginBottom: 8 }}>
                    {resumenPersona.modo === "anio" ? "Permisos por año" : "Permisos por mes"}
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    {/* Aquí es donde realmente cambia la gráfica según el
                        modo: dos <BarChart> distintos, y solo se dibuja
                        el que corresponde. */}
                    {resumenPersona.modo === "anio" ? (
                      <BarChart data={resumenPersona.porAnio} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D5" vertical={false} />
                        <XAxis dataKey="anio" tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={{ stroke: "#DAD6C8" }} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DAD6C8", fontSize: 13 }} formatter={(v) => [v, "Permisos"]} />
                        <Bar dataKey="cantidad" fill="#0F6E56" radius={[4, 4, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    ) : (
                      <BarChart data={resumenPersona.porMes} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D5" vertical={false} />
                        <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={{ stroke: "#DAD6C8" }} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DAD6C8", fontSize: 13 }} formatter={(v) => [v, "Permisos"]} />
                        <Bar dataKey="cantidad" fill="#0F6E56" radius={[4, 4, 0, 0]} maxBarSize={26} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6858", marginBottom: 8 }}>Por tipo de permiso</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={resumenPersona.porConcepto} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D5" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis dataKey="concepto" type="category" width={100} tick={{ fontSize: 12, fill: "#1E2A38" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DAD6C8", fontSize: 13 }} formatter={(v) => [v, "Permisos"]} />
                      <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} maxBarSize={20}>
                        {resumenPersona.porConcepto.map((entry, i) => (
                          <Cell key={i} fill={CONCEPT_COLORS[entry.concepto] || FALLBACK_COLOR} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </Section>

        {/* ---------- Sección "Consulta por persona" (tabla de búsqueda) ---------- */}
        <Section title="Consulta por persona" subtitle="Escribe un nombre para ver su historial en el período seleccionado" style={{ marginTop: 24 }}>
          <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, background: "#FFFFFF", border: "1px solid #DAD6C8", borderRadius: 6, padding: "8px 12px", marginBottom: 14 }}>
            <Search size={16} color="#6B6858" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Ej: Yeni An Galeano"
              style={{ border: "none", outline: "none", flex: 1, fontSize: 14, background: "transparent", color: "#1E2A38" }}
            />
          </div>
          {/* Tres posibles estados: (1) no se ha escrito nada → no muestra
              nada, (2) se escribió algo pero no hay resultados → mensaje
              de "no encontrado", (3) hay resultados → la tabla. */}
          {busqueda.trim() && (
            tablaBusqueda.length === 0 ? (
              <div style={{ fontSize: 13, color: "#6B6858" }}>No se encontraron registros para "{busqueda}".</div>
            ) : (
              <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#6B6858", borderBottom: "1px solid #DAD6C8" }}>
                      <th style={{ padding: "6px 8px" }}>Fecha</th>
                      <th style={{ padding: "6px 8px" }}>Nombre</th>
                      <th style={{ padding: "6px 8px" }}>Concepto</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablaBusqueda.map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #EFECE1" }}>
                        <td style={{ padding: "6px 8px" }}>{r.fecha}</td>
                        <td style={{ padding: "6px 8px" }}>{r.nombre}</td>
                        <td style={{ padding: "6px 8px" }}>{r.concepto}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>{r.tiempoMin != null ? fmtHoras(r.tiempoMin) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </Section>
      </div>
    </div>
  );
}


// ============================================================================
// PARTE 6: Componentes pequeños reutilizables
// ----------------------------------------------------------------------------
// Estos tres NO son el componente principal — son "piezas de Lego" que se
// usan varias veces dentro del dashboard, para no repetir el mismo bloque
// de HTML/estilos una y otra vez.
// ============================================================================

// Tarjetita pequeña con una barrita de color a la izquierda, usada en los
// comparadores (año A vs B, resumen por persona).
function MiniStat({ label, value, color }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E5E1D5", borderLeft: `3px solid ${color}`, borderRadius: 6, padding: "10px 14px" }}>
      <div style={{ fontSize: 11, color: "#6B6858", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1E2A38" }}>{value.toLocaleString("es-CO")}</div>
    </div>
  );
}

// Las 4 tarjetas grandes de arriba del todo (Total permisos, Horas
// totales, etc.). Recibe un ícono, una etiqueta y un valor ya formateado.
function KpiCard({ icon, label, value }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E5E1D5", borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6B6858", marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

// La "caja blanca con borde" que envuelve cada bloque del dashboard
// (cada gráfica vive dentro de un <Section>). "children" es lo que sea
// que se ponga DENTRO de <Section>...</Section> al usarlo — así este
// componente no necesita saber de antemano qué gráfica va a mostrar.
function Section({ title, subtitle, children, style }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E5E1D5", borderRadius: 10, padding: "18px 20px", ...style }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "#6B6858", marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}