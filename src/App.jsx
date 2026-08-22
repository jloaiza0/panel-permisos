import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { Clock, Users, FileText, TrendingUp, Search, RotateCcw, Printer, Filter } from "lucide-react";
import FileUploader from "./components/FileUploader";

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const CONCEPT_COLORS = {
  "Cita médica": "#0F6E56",
  "Personal": "#378ADD",
  "Estudio": "#BA7517",
  "Compensatorio": "#D85A30",
  "C Votacion": "#7F77DD",
};
const FALLBACK_COLOR = "#888780";

function fmtHoras(min) {
  const h = min / 60;
  return h % 1 === 0 ? `${h}` : h.toFixed(1);
}

export default function App() {
  const [datos, setDatos] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [anioSel, setAnioSel] = useState("Todos");
  const [conceptoSel, setConceptoSel] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");

  function handleDatosCargados(registros, nombreArchivo) {
    setDatos(registros);
    setNombreArchivo(nombreArchivo);
    setAnioSel("Todos");
    const anios = Array.from(new Set(registros.map(r => r.anio))).sort();
    setAnioA(anios[anios.length - 2] ?? anios[0] ?? null);
    setAnioB(anios[anios.length - 1] ?? null);
  }

  function reiniciar() {
    setDatos(null);
    setNombreArchivo("");
    setBusqueda("");
  }

  function descargarPDF() {
    window.print();
  }

  const anios = useMemo(
    () => (datos ? Array.from(new Set(datos.map(r => r.anio))).sort() : []),
    [datos]
  );

  const filtrado = useMemo(() => {
    if (!datos) return [];
    return datos.filter(r =>
      (anioSel === "Todos" || r.anio === anioSel) &&
      (conceptoSel === "Todos" || r.concepto === conceptoSel)
    );
  }, [datos, anioSel, conceptoSel]);

  const conceptosDisponibles = useMemo(
    () => (datos ? Array.from(new Set(datos.map(r => r.concepto))).sort() : []),
    [datos]
  );

  const kpis = useMemo(() => {
    const totalPermisos = filtrado.length;
    const totalMin = filtrado.reduce((s, r) => s + (r.tiempoMin || 0), 0);
    const personas = new Set(filtrado.map(r => r.nombre)).size;
    const promedio = personas ? totalPermisos / personas : 0;
    return { totalPermisos, totalHoras: totalMin / 60, personas, promedio };
  }, [filtrado]);

  const porMes = useMemo(() => {
    const map = {};
    MESES.forEach(m => { map[m] = { mes: m, cantidad: 0 }; });
    filtrado.forEach(r => { if (map[r.mes]) map[r.mes].cantidad += 1; });
    return MESES.map(m => map[m]);
  }, [filtrado]);

  const porConcepto = useMemo(() => {
    const map = {};
    filtrado.forEach(r => {
      const c = r.concepto || "Sin dato";
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map)
      .map(([concepto, cantidad]) => ({ concepto, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [filtrado]);

  const topPersonas = useMemo(() => {
    const map = {};
    filtrado.forEach(r => { map[r.nombre] = (map[r.nombre] || 0) + 1; });
    return Object.entries(map)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  }, [filtrado]);

  // --- Comparación entre años (usa TODOS los datos, no el filtro de año) ---
  const ANIO_COLORS = ["#0F6E56", "#D85A30", "#378ADD", "#BA7517", "#7F77DD"];

  const porAnio = useMemo(() => {
    if (!datos) return [];
    const map = {};
    datos.forEach(r => {
      if (!map[r.anio]) map[r.anio] = { anio: r.anio, cantidad: 0, minutos: 0 };
      map[r.anio].cantidad += 1;
      map[r.anio].minutos += r.tiempoMin || 0;
    });
    return Object.values(map)
      .map(x => ({ ...x, horas: Number((x.minutos / 60).toFixed(1)) }))
      .sort((a, b) => a.anio - b.anio);
  }, [datos]);

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

  const aniosComparables = useMemo(
    () => (datos ? Array.from(new Set(datos.map(r => r.anio))).sort() : []),
    [datos]
  );

  const [anioA, setAnioA] = useState(null);
  const [anioB, setAnioB] = useState(null);

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

  const resumenAvsB = useMemo(() => {
    if (!datos || anioA == null || anioB == null) return null;
    const calc = (anio) => {
      const regs = datos.filter(r => r.anio === anio);
      const minutos = regs.reduce((s, r) => s + (r.tiempoMin || 0), 0);
      return { cantidad: regs.length, horas: Number((minutos / 60).toFixed(1)) };
    };
    return { a: calc(anioA), b: calc(anioB) };
  }, [datos, anioA, anioB]);

  const personasDisponibles = useMemo(
    () => (datos ? Array.from(new Set(datos.map(r => r.nombre))).sort() : []),
    [datos]
  );

  const [personaSel, setPersonaSel] = useState("");

  const resumenPersona = useMemo(() => {
    if (!datos || !personaSel) return null;

    const conceptoMatch = (r) => conceptoSel === "Todos" || r.concepto === conceptoSel;

    if (anioSel === "Todos") {
      // Vista general: desglose por año
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
        modo: "anio",
        total: regs.length,
        totalHoras: Number((totalMin / 60).toFixed(1)),
        porAnio: porAnioPersona,
        porConcepto: porConceptoPersona,
      };
    }

    // Vista de un año específico: desglose por mes
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

  const tablaBusqueda = useMemo(() => {
    if (!busqueda.trim()) return [];
    const q = busqueda.trim().toLowerCase();
    return filtrado
      .filter(r => r.nombre.toLowerCase().includes(q))
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  }, [filtrado, busqueda]);

  // --- Sin datos: mostrar el uploader ---
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

  // --- Con datos: mostrar el dashboard ---
  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", background: "#F6F4EF", minHeight: "100vh", width: "100%", padding: "32px 40px", color: "#1E2A38", boxSizing: "border-box" }}>
      <div style={{ width: "100%", margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 28, borderBottom: "1px solid #DAD6C8", paddingBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B6858", fontWeight: 600, marginBottom: 6 }}>
              {nombreArchivo}
            </div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 30, fontWeight: 700, margin: 0 }}>
              Panel de ausentismo
            </h1>
          </div>
          <div className="no-print" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {["Todos", ...anios].map(a => (
              <button
                key={a}
                onClick={() => setAnioSel(a)}
                style={{
                  padding: "8px 14px", borderRadius: 6,
                  border: "1px solid " + (anioSel === a ? "#0F6E56" : "#DAD6C8"),
                  background: anioSel === a ? "#0F6E56" : "#FFFFFF",
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 32 }}>
          <KpiCard icon={<FileText size={18} />} label="Total permisos" value={kpis.totalPermisos.toLocaleString("es-CO")} />
          <KpiCard icon={<Clock size={18} />} label="Horas totales" value={kpis.totalHoras.toLocaleString("es-CO", { maximumFractionDigits: 0 })} />
          <KpiCard icon={<Users size={18} />} label="Personas con permisos" value={kpis.personas.toLocaleString("es-CO")} />
          <KpiCard icon={<TrendingUp size={18} />} label="Promedio por persona" value={kpis.promedio.toLocaleString("es-CO", { maximumFractionDigits: 1 })} />
        </div>

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

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, marginTop: 24 }}>
          <Section title="Por tipo de permiso" subtitle="Distribución de conceptos">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={porConcepto} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="concepto" type="category" width={100} tick={{ fontSize: 12, fill: "#1E2A38" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DAD6C8", fontSize: 13 }} formatter={(v) => [v, "Permisos"]} />
                <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {porConcepto.map((entry, i) => (
                    <Cell key={i} fill={CONCEPT_COLORS[entry.concepto] || FALLBACK_COLOR} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>

          <Section title="Top 10 personas" subtitle="Mayor número de permisos">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topPersonas} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#6B6858" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="nombre" type="category" width={200} interval={0} tick={{ fontSize: 12, fill: "#1E2A38" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v.length > 26 ? v.slice(0, 25) + "…" : v} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DAD6C8", fontSize: 13 }} formatter={(v) => [v, "Permisos"]} />
                <Bar dataKey="cantidad" fill="#D85A30" radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </div>

        {anioSel === "Todos" && aniosComparables.length > 1 && (
          <Section title="Comparativo entre años" subtitle="Todos los años, sin aplicar el filtro de arriba" style={{ marginTop: 24 }}>
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
                  {anioA != null && <Bar dataKey={anioA} name={String(anioA)} fill="#0F6E56" radius={[3, 3, 0, 0]} maxBarSize={26} />}
                  {anioB != null && <Bar dataKey={anioB} name={String(anioB)} fill="#D85A30" radius={[3, 3, 0, 0]} maxBarSize={26} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        )}

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

function MiniStat({ label, value, color }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E5E1D5", borderLeft: `3px solid ${color}`, borderRadius: 6, padding: "10px 14px" }}>
      <div style={{ fontSize: 11, color: "#6B6858", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1E2A38" }}>{value.toLocaleString("es-CO")}</div>
    </div>
  );
}

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