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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LabelList,
} from "recharts"; // librería de terceros que dibuja las gráficas de barras
import { Clock, Users, FileText, TrendingUp, Search, RotateCcw, Printer, Filter, FileSpreadsheet, ArrowUpRight, ArrowDownRight, SearchX } from "lucide-react"; // iconos
import FileUploader from "./components/FileUploader";
import ThemeToggle from "./components/ThemeToggle";


// ----------------------------------------------------------------------------
// PARTE 1: Datos fijos y funciones pequeñas
// ----------------------------------------------------------------------------

// Lista de meses en el orden correcto. Se usa en varias gráficas para que
// siempre aparezcan de Enero a Diciembre, aunque el Excel no tenga datos
// en todos los meses (por eso NO sacamos esta lista de los datos: la
// tenemos fija de antemano).
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// PALETA DE LAS GRÁFICAS
// Validada con un script de accesibilidad: los colores que quedan uno al
// lado del otro (por ejemplo, los años en una misma gráfica) se pueden
// distinguir también con daltonismo. La anterior fallaba: el naranja de
// COMPENSATORIO y el ocre de ESTUDIO eran casi idénticos para ~8% de los
// hombres. El verde sigue siendo el de la marca, con un poco más de color.
//
// Los colores NO están escritos aquí: son variables CSS (--s1 ... --s5 en
// index.css), porque cambian entre modo claro y modo oscuro. Las gráficas
// SVG aceptan "var(--s1)" como color, así que al cambiar de tema se
// repintan solas sin volver a calcular nada.
const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];

// Color para gráficas de UNA sola serie (permisos por mes, top 10...).
// Es un gris azulado neutro a propósito: si fuera verde, se confundiría
// con "CITA MÉDICA", que usa el verde en las gráficas por concepto.
const SINGLE = "var(--single)";

// Color FIJO por tipo de permiso: "CITA MÉDICA" es verde en todas las
// gráficas, "PERSONAL" azul, etc. El color sigue al concepto, nunca a su
// posición en el ranking (si no, al filtrar cambiarían de color).
const CONCEPT_COLORS = {
  "CITA MÉDICA": SERIES[0],
  "PERSONAL": SERIES[1],
  "ESTUDIO": SERIES[2],
  "COMPENSATORIO": SERIES[3],
  "C VOTACION": SERIES[4],
};
// Color de respaldo para un concepto nuevo que no esté en la lista.
const FALLBACK_COLOR = "var(--fallback)";

// Colores de texto/líneas para las gráficas, también como variables CSS
// (cambian con el tema; ver index.css).
const C = { ink: "var(--ink)", ink2: "var(--ink-2)", grid: "var(--grid)", axis: "var(--axis)", surface: "var(--surface)" };

// ¿El usuario pidió "reducir movimiento" en su sistema operativo?
const REDUCE_MOTION =
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Animación de las barras/líneas. Recharts trae 1.5 segundos por defecto:
// en un dashboard donde cambias filtros decenas de veces, eso se siente
// lento. 300ms con "ease-out" muestra el cambio sin hacerte esperar.
const ANIM = { isAnimationActive: !REDUCE_MOTION, animationDuration: 300, animationEasing: "ease-out" };

// Piezas comunes de todas las gráficas:
//  - Rejilla: línea fina y SÓLIDA (las punteadas meten ruido visual).
//  - Ejes: texto gris, sin rayitas.
//  - Tooltip: componente propio (ChartTooltip, al final del archivo), sin
//    animación porque se usa muchísimas veces seguidas.
const GRID_H = { stroke: C.grid, vertical: false };
const GRID_V = { stroke: C.grid, horizontal: false };
const TICK = { fontSize: 12, fill: C.ink2 };
const TICK_INK = { fontSize: 12, fill: C.ink, fontWeight: 500 };
const AXIS_X = { tick: TICK, axisLine: { stroke: C.axis }, tickLine: false, tickMargin: 8 };
const AXIS_Y = { tick: TICK, axisLine: false, tickLine: false, allowDecimals: false, width: 36 };
const TOOLTIP_BAR = { isAnimationActive: false, cursor: { fill: "var(--chart-cursor)" } };
const TOOLTIP_LINE = { isAnimationActive: false, cursor: { stroke: C.axis, strokeWidth: 1 } };
// Etiqueta de valor en la punta de las barras horizontales.
const TIP_LABEL = { position: "right", offset: 8, fill: C.ink, fontSize: 12, fontWeight: 600 };

// Leyenda: el TEXTO siempre en color de tinta (no en el color de la serie,
// que en amarillo o naranja se lee mal); el color va en el puntito.
const LEGEND = {
  iconType: "circle",
  iconSize: 8,
  wrapperStyle: { fontSize: 12, paddingTop: 8 },
  formatter: (v) => <span style={{ color: C.ink, marginRight: 8 }}>{v}</span>,
};

// Convierte minutos a horas para mostrar en pantalla, con hasta 1 decimal
// (pero sin decimal si es un número redondo). Ejemplo: 480 minutos → "8",
// 450 minutos → "7.5".
// ¿La pantalla es angosta (celular)? Se usa para darle menos espacio a
// los nombres en el Top 10 y que las barras no queden diminutas. Escucha
// los cambios de tamaño (por ejemplo, al girar el celular).
function useNarrow(maxWidth = 520) {
  const query = `(max-width: ${maxWidth}px)`;
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return narrow;
}

// Calcula los 4 KPIs (indicadores) de una lista de registros. Está aparte
// porque se usa dos veces: para el período elegido y para el año anterior.
function calcKpis(regs) {
  const totalPermisos = regs.length;
  const totalMin = regs.reduce((s, r) => s + (r.tiempoMin || 0), 0); // suma de todos los minutos
  const personas = new Set(regs.map(r => r.nombre)).size; // Set elimina nombres repetidos
  const promedio = personas ? totalPermisos / personas : 0;
  return { totalPermisos, totalHoras: totalMin / 60, personas, promedio };
}

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

  // Pantalla de celular (ver useNarrow arriba)
  const narrow = useNarrow();
  const nombreMax = narrow ? 16 : 24; // caracteres visibles del nombre en el Top 10


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
  const kpis = useMemo(() => calcKpis(filtrado), [filtrado]);

  // Los mismos KPIs, pero del AÑO ANTERIOR al elegido (con los mismos
  // filtros de concepto y mes). Sirve para mostrar debajo de cada número
  // un "+12% vs 2024". Solo existe si hay un año específico elegido y el
  // Excel trae datos del año anterior; si no, queda en null y no se muestra.
  const kpisPrev = useMemo(() => {
    if (!datos || anioSel === "Todos") return null;
    const prev = anioSel - 1;
    if (!datos.some(r => r.anio === prev)) return null;
    const regs = datos.filter(r =>
      r.anio === prev &&
      (conceptoSel === "Todos" || r.concepto === conceptoSel) &&
      (mesSel === "Todos" || r.mes === mesSel)
    );
    return { anio: prev, ...calcKpis(regs) };
  }, [datos, anioSel, conceptoSel, mesSel]);

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
    const map = Object.create(null); // sin prototipo: un concepto llamado "constructor" o "__proto__" cuenta normal
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
    const map = Object.create(null); // sin prototipo (ver porConcepto)
    filtrado.forEach(r => { map[r.nombre] = (map[r.nombre] || 0) + 1; });
    return Object.entries(map)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  }, [filtrado]);

  // Colores para distinguir cada año en las gráficas comparativas.
  const ANIO_COLORS = SERIES;

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

      const conceptoMap = Object.create(null);
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

    const conceptoMap = Object.create(null);
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
  // Los estilos visuales viven como CLASES en index.css (.btn, .chip,
  // .card, etc.) para poder tener hover, efecto al presionar y foco de
  // teclado. Aquí en el JSX solo quedan ajustes de espaciado puntuales.

  // CASO A: todavía no se ha subido ningún Excel (datos === null).
  if (!datos) {
    return (
      <main className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="corner-toggle no-print"><ThemeToggle /></div>
        <div className="reveal" style={{ maxWidth: 480, width: "100%" }}>
          <h1 className="page-title" style={{ textAlign: "center", marginBottom: 8 }}>
            Panel de ausentismo
          </h1>
          <p style={{ textAlign: "center", color: "var(--ink-2)", fontSize: 15, marginBottom: 28 }}>
            Selecciona el Excel de permisos para comenzar
          </p>
          <FileUploader onDatosCargados={handleDatosCargados} />
        </div>
      </main>
    );
  }

  // Color de cada año: siempre el mismo en todas las gráficas (2024 es
  // azul aquí y en el comparador A vs B, sin importar cuál elijas).
  const colorAnio = (a) => ANIO_COLORS[Math.max(0, aniosComparables.indexOf(a)) % ANIO_COLORS.length];

  // Mes con más permisos: se marca con su valor encima de la barra (en vez
  // de poner un número en cada barra, que nadie lee).
  const maxMes = porMes.reduce((m, x) => (x.cantidad > m ? x.cantidad : m), 0);

  // Variación contra el año anterior para cada KPI (null si no aplica).
  const delta = (clave) => {
    if (!kpisPrev || !kpisPrev[clave]) return null;
    return { pct: ((kpis[clave] - kpisPrev[clave]) / kpisPrev[clave]) * 100, anio: kpisPrev.anio };
  };

  // CASO B: ya hay datos cargados → se dibuja el dashboard completo.
  //
  // className="reveal" + style={{ "--i": n }}: cada bloque entra con una
  // pequeña cascada (ver ".reveal" en index.css). "--i" es el orden.
  return (
    <main className="page">

      {/* ---------- Encabezado: título, archivo cargado y botones ---------- */}
      <header className="page-head reveal" style={{ "--i": 0 }}>
        <div>
          <h1 className="page-title">Panel de ausentismo</h1>
          <p className="page-meta">
            <FileSpreadsheet size={14} aria-hidden="true" />
            <span>{nombreArchivo}</span>
            <span aria-hidden="true">·</span>
            <span>{datos.length.toLocaleString("es-CO")} registros</span>
          </p>
        </div>

        {/* className="no-print": estos controles NO salen en el PDF */}
        <div className="toolbar no-print">
          {/* aria-pressed le dice a los lectores de pantalla cuál está
              activo, y el CSS usa ese mismo atributo para pintarlo. */}
          <YearSelector opciones={["Todos", ...anios]} valor={anioSel} onCambio={setAnioSel} />
          <span className="toolbar-sep" aria-hidden="true" />
          <button type="button" className="btn btn-primary" onClick={descargarPDF} title="Descargar como PDF">
            <Printer size={14} aria-hidden="true" /> Descargar PDF
          </button>
          <button type="button" className="btn" onClick={reiniciar} title="Cargar otro archivo">
            <RotateCcw size={14} aria-hidden="true" /> Otro archivo
          </button>
          {/* Botón sol/luna: cambia entre modo claro y oscuro */}
          <ThemeToggle />
        </div>
      </header>

      {/* ---------- Filtros de Concepto y Mes ---------- */}
      <div className="no-print reveal" style={{ "--i": 1, display: "grid", gap: 12, marginBottom: 24 }}>
        <div className="filter-row" role="group" aria-label="Filtrar por concepto">
          <span className="filter-label"><Filter size={14} aria-hidden="true" /> Concepto</span>
          {["Todos", ...conceptosDisponibles].map(c => (
            <button key={c} type="button" className="chip" aria-pressed={conceptoSel === c} onClick={() => setConceptoSel(c)}>
              {/* Puntito con el color del concepto: así el filtro sirve
                  también de leyenda para las gráficas. */}
              {c !== "Todos" && <span className="chip-dot" style={{ background: CONCEPT_COLORS[c] || FALLBACK_COLOR }} aria-hidden="true" />}
              {c}
            </button>
          ))}
        </div>
        <div className="filter-row" role="group" aria-label="Filtrar por mes">
          <span className="filter-label"><Filter size={14} aria-hidden="true" /> Mes</span>
          {["Todos", ...MESES].map(m => (
            <button key={m} type="button" className="chip" aria-pressed={mesSel === m} onClick={() => setMesSel(m)}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Las 4 tarjetas de KPI ---------- */}
      <div className="grid-kpi reveal" style={{ "--i": 2, marginBottom: 20 }}>
        <KpiCard icon={<FileText size={16} />} label="Total permisos" value={kpis.totalPermisos.toLocaleString("es-CO")} delta={delta("totalPermisos")} />
        <KpiCard icon={<Clock size={16} />} label="Horas totales" value={kpis.totalHoras.toLocaleString("es-CO", { maximumFractionDigits: 0 })} delta={delta("totalHoras")} />
        <KpiCard icon={<Users size={16} />} label="Personas con permisos" value={kpis.personas.toLocaleString("es-CO")} delta={delta("personas")} />
        <KpiCard icon={<TrendingUp size={16} />} label="Promedio por persona" value={kpis.promedio.toLocaleString("es-CO", { maximumFractionDigits: 1 })} delta={delta("promedio")} />
      </div>

      {/* Si los filtros no dejan ningún registro, en vez de gráficas vacías
          se explica qué pasó y se ofrece quitar los filtros. */}
      {filtrado.length === 0 ? (
        <section className="card empty-state fade-in" role="status">
          <span className="empty-icon" aria-hidden="true"><SearchX size={22} /></span>
          <h2 className="card-title">No hay permisos con estos filtros</h2>
          <p className="card-subtitle" style={{ maxWidth: "52ch" }}>
            {/* Ej: "No hay registros de C VOTACION en Mar 2023." */}
            No hay registros{conceptoSel !== "Todos" && ` de ${conceptoSel}`}
            {(mesSel !== "Todos" || anioSel !== "Todos") &&
              ` en ${[mesSel !== "Todos" && mesSel, anioSel !== "Todos" && anioSel].filter(Boolean).join(" ")}`}.
            {" "}Prueba con otro mes o concepto.
          </p>
          <button type="button" className="btn" style={{ marginTop: 16 }}
            onClick={() => { setConceptoSel("Todos"); setMesSel("Todos"); }}>
            Quitar filtros de concepto y mes
          </button>
        </section>
      ) : (
      <>
      {/* ---------- Gráfica: Permisos por mes ---------- */}
      <Section className="reveal" style={{ "--i": 3 }} title="Permisos por mes" subtitle={anioSel === "Todos" ? "Todos los años combinados" : `Año ${anioSel}`}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={porMes} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID_H} />
            <XAxis dataKey="mes" {...AXIS_X} />
            <YAxis {...AXIS_Y} />
            <Tooltip {...TOOLTIP_BAR} content={<ChartTooltip />} />
            <Bar {...ANIM} dataKey="cantidad" name="Permisos" fill={SINGLE} radius={[4, 4, 0, 0]} maxBarSize={24}>
              {/* Solo el mes pico lleva su número encima */}
              <LabelList dataKey="cantidad" content={(p) => <PeakLabel {...p} max={maxMes} />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* ---------- Gráficas: Por tipo de permiso + Top 10 personas ---------- */}
      <div className="grid-split reveal" style={{ "--i": 4, marginTop: 20 }}>
        <Section title="Por tipo de permiso" subtitle={mesSel === "Todos" ? "Distribución de conceptos" : `Distribución de conceptos — ${mesSel}`}>
          <ResponsiveContainer width="100%" height={Math.max(180, porConcepto.length * 44 + 24)}>
            <BarChart data={porConcepto} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_V} />
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis dataKey="concepto" type="category" width={116} tick={TICK_INK} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_BAR} content={<ChartTooltip colorOf={(l) => CONCEPT_COLORS[l] || FALLBACK_COLOR} />} />
              <Bar {...ANIM} dataKey="cantidad" name="Permisos" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {porConcepto.map((entry, i) => (
                  <Cell key={i} fill={CONCEPT_COLORS[entry.concepto] || FALLBACK_COLOR} />
                ))}
                <LabelList dataKey="cantidad" {...TIP_LABEL} formatter={fmtNum} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Top 10 personas" subtitle={mesSel === "Todos" ? "Mayor número de permisos" : `Mayor número de permisos — ${mesSel}`}>
          <ResponsiveContainer width="100%" height={Math.max(180, topPersonas.length * 30 + 24)}>
            <BarChart data={topPersonas} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_V} />
              <XAxis type="number" hide allowDecimals={false} />
              {/* interval={0} obliga a mostrar los 10 nombres; tickFormatter
                  recorta nombres muy largos (el nombre completo sale en el
                  tooltip). */}
              <YAxis dataKey="nombre" type="category" width={narrow ? 120 : 200} interval={0} tick={{ ...TICK_INK, width: 400 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v.length > nombreMax ? v.slice(0, nombreMax - 1).trimEnd() + "…" : v} />
              <Tooltip {...TOOLTIP_BAR} content={<ChartTooltip />} />
              <Bar {...ANIM} dataKey="cantidad" name="Permisos" fill={SINGLE} radius={[0, 4, 4, 0]} maxBarSize={18}>
                <LabelList dataKey="cantidad" {...TIP_LABEL} formatter={fmtNum} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>
      </>
      )}

      {/* ---------- Sección "Comparativo entre años" ----------
          Solo se dibuja si el filtro de año está en "Todos" y el Excel
          tiene más de un año de datos. */}
      {anioSel === "Todos" && aniosComparables.length > 1 && (
        <Section className="fade-in" title="Comparativo entre años" subtitle="Todos los años, sin aplicar el filtro de arriba" style={{ marginTop: 20 }}>

          {/* Dos medidas distintas (permisos y horas) = dos gráficas, nunca
              una sola con dos ejes. */}
          <div className="grid-split">
            <div>
              <div className="sub-title">Total de permisos por año</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={porAnio} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRID_H} />
                  <XAxis dataKey="anio" {...AXIS_X} />
                  <YAxis {...AXIS_Y} />
                  <Tooltip {...TOOLTIP_BAR} content={<ChartTooltip colorOf={colorAnio} />} />
                  <Bar {...ANIM} dataKey="cantidad" name="Permisos" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {porAnio.map((entry) => <Cell key={entry.anio} fill={colorAnio(entry.anio)} />)}
                    <LabelList dataKey="cantidad" position="top" offset={8} fill={C.ink} fontSize={12} fontWeight={600} formatter={fmtNum} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div className="sub-title">Horas totales por año</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={porAnio} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRID_H} />
                  <XAxis dataKey="anio" {...AXIS_X} />
                  <YAxis {...AXIS_Y} width={44} />
                  <Tooltip {...TOOLTIP_BAR} content={<ChartTooltip colorOf={colorAnio} />} />
                  <Bar {...ANIM} dataKey="horas" name="Horas" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {porAnio.map((entry) => <Cell key={entry.anio} fill={colorAnio(entry.anio)} />)}
                    <LabelList dataKey="horas" position="top" offset={8} fill={C.ink} fontSize={12} fontWeight={600} formatter={fmtNum} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Evolución mes a mes: LÍNEAS (una por año). Antes eran 36 barras
              apretadas; con líneas se lee de un vistazo qué año va arriba. */}
          <div style={{ marginTop: 28 }}>
            <div className="sub-title">Permisos por mes, comparado entre años</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={mesPorAnio} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID_H} />
                <XAxis dataKey="mes" {...AXIS_X} padding={{ left: 12, right: 12 }} />
                <YAxis {...AXIS_Y} />
                <Tooltip {...TOOLTIP_LINE} content={<ChartTooltip />} />
                <Legend {...LEGEND} />
                {aniosComparables.map((a) => (
                  <Line {...ANIM} key={a} type="linear" dataKey={a} name={String(a)} stroke={colorAnio(a)} strokeWidth={2}
                    dot={{ r: 3.5, fill: colorAnio(a), stroke: C.surface, strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: colorAnio(a), stroke: C.surface, strokeWidth: 2 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Comparador manual: dos <select> donde eliges año A y año B */}
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--line-soft)" }}>
            <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <div className="sub-title" style={{ marginBottom: 0 }}>Comparar año específico contra otro</div>
              <select className="field num" aria-label="Primer año" value={anioA ?? ""} onChange={(e) => setAnioA(Number(e.target.value))}>
                {aniosComparables.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <span style={{ color: "var(--ink-2)", fontSize: 13 }}>vs</span>
              <select className="field num" aria-label="Segundo año" value={anioB ?? ""} onChange={(e) => setAnioB(Number(e.target.value))}>
                {aniosComparables.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {resumenAvsB && (
              <div className="grid-stats" style={{ marginBottom: 16 }}>
                <MiniStat label={`Permisos ${anioA}`} value={resumenAvsB.a.cantidad} color={colorAnio(anioA)} />
                <MiniStat label={`Permisos ${anioB}`} value={resumenAvsB.b.cantidad} color={colorAnio(anioB)} />
                <MiniStat label={`Horas ${anioA}`} value={resumenAvsB.a.horas} color={colorAnio(anioA)} />
                <MiniStat label={`Horas ${anioB}`} value={resumenAvsB.b.horas} color={colorAnio(anioB)} />
              </div>
            )}

            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={mesAvsB} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID_H} />
                <XAxis dataKey="mes" {...AXIS_X} padding={{ left: 12, right: 12 }} />
                <YAxis {...AXIS_Y} />
                <Tooltip {...TOOLTIP_LINE} content={<ChartTooltip />} />
                <Legend {...LEGEND} />
                {/* Cada línea solo se dibuja si su año ya fue elegido */}
                {[anioA, anioB].filter(a => a != null).map(a => (
                  <Line {...ANIM} key={a} type="linear" dataKey={a} name={String(a)} stroke={colorAnio(a)} strokeWidth={2}
                    dot={{ r: 3.5, fill: colorAnio(a), stroke: C.surface, strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: colorAnio(a), stroke: C.surface, strokeWidth: 2 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* ---------- Sección "Resumen por persona" ---------- */}
      <Section
        title="Resumen por persona"
        subtitle={anioSel === "Todos" ? "Todos los años combinados" : `Desglosado por mes — año ${anioSel}`}
        style={{ marginTop: 20 }}
      >
        <select
          className="field no-print"
          aria-label="Persona"
          value={personaSel}
          onChange={(e) => setPersonaSel(e.target.value)}
          style={{ marginBottom: 16, minWidth: 260, maxWidth: "100%" }}
        >
          <option value="">Selecciona una persona</option>
          {personasDisponibles.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        {!resumenPersona && (
          <p className="empty-note">Elige una persona para ver sus permisos y horas por {anioSel === "Todos" ? "año" : "mes"} y por tipo.</p>
        )}

        {/* key={personaSel}: al cambiar de persona el bloque hace un
            fundido corto, así se nota que el dato cambió. */}
        {resumenPersona && (
          <div key={personaSel} className="fade-in">
            <div className="grid-stats" style={{ marginBottom: 20 }}>
              <MiniStat label="Total permisos" value={resumenPersona.total} />
              <MiniStat label="Total horas" value={resumenPersona.totalHoras} />
            </div>

            <div className="grid-split">
              <div>
                <div className="sub-title">
                  {resumenPersona.modo === "anio" ? "Permisos por año" : "Permisos por mes"}
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  {resumenPersona.modo === "anio" ? (
                    <BarChart data={resumenPersona.porAnio} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid {...GRID_H} />
                      <XAxis dataKey="anio" {...AXIS_X} />
                      <YAxis {...AXIS_Y} />
                      <Tooltip {...TOOLTIP_BAR} content={<ChartTooltip />} />
                      <Bar {...ANIM} dataKey="cantidad" name="Permisos" fill={SINGLE} radius={[4, 4, 0, 0]} maxBarSize={40}>
                        <LabelList dataKey="cantidad" position="top" offset={8} fill={C.ink} fontSize={12} fontWeight={600} />
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart data={resumenPersona.porMes} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid {...GRID_H} />
                      <XAxis dataKey="mes" {...AXIS_X} />
                      <YAxis {...AXIS_Y} />
                      <Tooltip {...TOOLTIP_BAR} content={<ChartTooltip />} />
                      <Bar {...ANIM} dataKey="cantidad" name="Permisos" fill={SINGLE} radius={[4, 4, 0, 0]} maxBarSize={20} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
              <div>
                <div className="sub-title">Por tipo de permiso</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={resumenPersona.porConcepto} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
                    <CartesianGrid {...GRID_V} />
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis dataKey="concepto" type="category" width={116} tick={TICK_INK} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_BAR} content={<ChartTooltip colorOf={(l) => CONCEPT_COLORS[l] || FALLBACK_COLOR} />} />
                    <Bar {...ANIM} dataKey="cantidad" name="Permisos" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {resumenPersona.porConcepto.map((entry, i) => (
                        <Cell key={i} fill={CONCEPT_COLORS[entry.concepto] || FALLBACK_COLOR} />
                      ))}
                      <LabelList dataKey="cantidad" {...TIP_LABEL} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* ---------- Sección "Consulta por persona" (tabla de búsqueda) ---------- */}
      <Section title="Consulta por persona" subtitle="Escribe un nombre para ver su historial en el período seleccionado" style={{ marginTop: 20 }}>
        <label className="search no-print" style={{ marginBottom: 14 }}>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej: Yeni An Galeano"
            aria-label="Buscar por nombre"
            autoComplete="off"
          />
        </label>
        {/* Tres estados: (1) sin texto → nada, (2) sin resultados →
            mensaje, (3) con resultados → la tabla. */}
        {busqueda.trim() && (
          tablaBusqueda.length === 0 ? (
            <p className="empty-note">
              No hay registros para “{busqueda.trim()}” con los filtros actuales. Revisa la ortografía o cambia el año, concepto o mes.
            </p>
          ) : (
            <>
              <p className="empty-note num" style={{ marginBottom: 8 }}>
                {tablaBusqueda.length.toLocaleString("es-CO")} {tablaBusqueda.length === 1 ? "registro" : "registros"}
              </p>
              <div className="table-wrap">
                <table className="table num">
                  <thead>
                    <tr>
                      <th scope="col">Fecha</th>
                      <th scope="col">Nombre</th>
                      <th scope="col">Concepto</th>
                      <th scope="col" className="r">Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablaBusqueda.map((r, i) => (
                      <tr key={i}>
                        <td style={{ whiteSpace: "nowrap" }}>{r.fecha}</td>
                        <td>{r.nombre}</td>
                        <td>
                          <span className="concept-tag">
                            <span className="chip-dot" style={{ background: CONCEPT_COLORS[r.concepto] || FALLBACK_COLOR }} aria-hidden="true" />
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
          )
        )}
      </Section>
    </main>
  );
}


// ============================================================================
// PARTE 6: Componentes pequeños reutilizables
// ----------------------------------------------------------------------------
// "Piezas de Lego" que se usan varias veces dentro del dashboard.
// ============================================================================

// Formatea un número con separador de miles colombiano (1.946).
function fmtNum(v) {
  return typeof v === "number" ? v.toLocaleString("es-CO") : v;
}

// Estadística pequeña usada en los comparadores (año A vs B, resumen por
// persona). Si recibe "color", un puntito indica a qué año pertenece.
function MiniStat({ label, value, color }) {
  return (
    <div>
      <div className="stat-label">
        {color && <span className="stat-dot" style={{ background: color }} aria-hidden="true" />}
        {label}
      </div>
      <div className="stat-value">{value.toLocaleString("es-CO")}</div>
    </div>
  );
}

// Las 4 tarjetas grandes de arriba (Total permisos, Horas totales, etc.).
// "delta" (opcional) = variación contra el año anterior. Más permisos u
// horas es PEOR (más ausentismo), por eso subir se marca en rojo y bajar
// en verde. Siempre va con flecha + texto, nunca solo color.
function KpiCard({ icon, label, value, delta }) {
  const sube = delta && delta.pct > 0.05;
  const baja = delta && delta.pct < -0.05;
  return (
    <div className="card kpi">
      <div className="kpi-label">
        <span aria-hidden="true" style={{ display: "inline-flex" }}>{icon}</span>
        {label}
      </div>
      {/* key={value}: cada vez que el número cambia, React crea un
          <span> nuevo y la animación "swap" vuelve a correr (fundido con
          un leve desenfoque, 180ms, al mismo tiempo que las barras). */}
      <div className="kpi-value"><span key={value} className="swap">{value}</span></div>
      {delta && (
        <div key={`${value}|${delta.anio}`} className="kpi-delta swap" data-trend={sube ? "up" : baja ? "down" : "flat"}>
          {sube && <ArrowUpRight size={14} aria-hidden="true" />}
          {baja && <ArrowDownRight size={14} aria-hidden="true" />}
          <span className="num">
            {sube ? "+" : ""}{delta.pct.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %
          </span>
          <span className="kpi-delta-ref">vs {delta.anio}</span>
        </div>
      )}
    </div>
  );
}

// Selector de año con indicador deslizante (técnica de Emil Kowalski).
// Hay DOS copias de los botones, una encima de la otra:
//   - Abajo: los botones reales (texto oscuro, se pueden pulsar).
//   - Arriba: una copia "activa" (fondo verde, texto blanco) recortada con
//     clip-path para que solo se vea el rectángulo del año elegido.
// Al cambiar de año se anima el recorte: el verde se desliza al nuevo
// botón y el color del texto cambia exactamente en el borde del verde,
// cosa que no se logra animando cada botón por separado.
function YearSelector({ opciones, valor, onCambio }) {
  const cajaRef = useRef(null);
  const botonesRef = useRef({});
  const [recorte, setRecorte] = useState(null);
  const [animar, setAnimar] = useState(false); // false = todavía no se ha medido

  // Mide dónde está el botón activo y calcula el recorte. Se repite si
  // cambia el año o el tamaño de la caja (por ejemplo, al girar el celular).
  useLayoutEffect(() => {
    const caja = cajaRef.current;
    const medir = () => {
      const b = botonesRef.current[valor];
      if (!caja || !b) return;
      const izq = b.offsetLeft;
      const der = caja.clientWidth - (b.offsetLeft + b.offsetWidth);
      setRecorte(`inset(0 ${der}px 0 ${izq}px round 6px)`);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(caja);
    return () => ro.disconnect();
  }, [valor, opciones.length]);

  // La primera vez el indicador aparece directo en su lugar, sin deslizarse.
  // (se activa un cuadro de pantalla después de la primera medida).
  useEffect(() => {
    if (!recorte || animar) return;
    const id = requestAnimationFrame(() => setAnimar(true));
    return () => cancelAnimationFrame(id);
  }, [recorte, animar]);

  return (
    <div ref={cajaRef} className="seg" role="group" aria-label="Filtrar por año">
      {opciones.map(o => (
        <button
          key={o}
          ref={el => { botonesRef.current[o] = el; }}
          type="button"
          className="seg-btn num"
          aria-pressed={valor === o}
          onClick={() => onCambio(o)}
        >
          {o}
        </button>
      ))}
      <div
        className="seg-overlay"
        aria-hidden="true"
        style={{
          clipPath: recorte ?? "inset(0 100% 0 0)",
          transition: animar ? undefined : "none",
        }}
      >
        {opciones.map(o => <span key={o} className="seg-btn num">{o}</span>)}
      </div>
    </div>
  );
}

// La caja blanca que envuelve cada bloque del dashboard. "className"
// permite sumarle clases extra (como "reveal" para la animación).
function Section({ title, subtitle, children, style, className = "" }) {
  return (
    <section className={`card ${className}`} style={style}>
      <div style={{ marginBottom: 16 }}>
        <h2 className="card-title">{title}</h2>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

// Cajita que aparece al pasar el mouse sobre una gráfica. Reemplaza la de
// Recharts porque esa pinta el TEXTO del color de la serie (en amarillo o
// naranja casi no se lee). Aquí el texto va en tinta y el color en un
// puntito al lado. "colorOf" sirve para gráficas donde cada barra tiene su
// propio color (por concepto o por año).
function ChartTooltip({ active, payload, label, colorOf }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <div className="chart-tip-title">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey + String(p.name)} className="chart-tip-row">
          <span className="stat-dot" style={{ background: colorOf ? colorOf(label) : p.color }} aria-hidden="true" />
          <span className="chart-tip-name">{p.name}</span>
          <span className="chart-tip-value num">{fmtNum(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// Etiqueta que solo se dibuja sobre la barra con el valor máximo (el mes
// pico). Recharts la llama una vez por barra; las demás devuelven null.
function PeakLabel({ x, y, width, value, max }) {
  if (!max || value !== max) return null;
  return (
    <text x={x + width / 2} y={y - 8} textAnchor="middle" fill={C.ink} fontSize={12} fontWeight={600}>
      {fmtNum(value)}
    </text>
  );
}
