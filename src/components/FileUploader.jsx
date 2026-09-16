// ============================================================================
// FileUploader.jsx
// ----------------------------------------------------------------------------
// ¿PARA QUÉ SIRVE ESTE ARCHIVO?
//
// Es la cajita donde seleccionas (o arrastras) tu Excel de permisos. Cuando
// eliges un archivo, este componente:
//   1. Revisa que sea .xlsx o .xls
//   2. Revisa que no pese demasiado
//   3. Se lo pasa a parseExcel.js para que lo convierta en datos usables
//   4. Si todo sale bien, le avisa a App.jsx (el componente padre) que ya
//      hay datos listos, mediante la función onDatosCargados
//   5. Si algo sale mal, muestra un mensaje de error en pantalla
//
// Este archivo NO sabe nada de gráficas ni de KPIs — su única
// responsabilidad es "conseguir el archivo y entregarlo ya procesado".
// Ese reparto de tareas (un archivo, una responsabilidad) es lo que hace
// que el proyecto sea más fácil de mantener.
// ============================================================================

import { useRef, useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react"; // iconos
import { parseExcel } from "../lib/parseExcel"; // la función que de verdad lee el Excel

// "onDatosCargados" es una FUNCIÓN que este componente recibe desde afuera
// (desde App.jsx). Es la forma en que React permite que un componente hijo
// "hable" con su padre: cuando el archivo ya está listo, este componente
// simplemente llama a onDatosCargados(...) y App.jsx se entera.
export default function FileUploader({ onDatosCargados }) {

  // useRef: una "referencia" directa a la etiqueta <input> de más abajo
  // (la que está oculta). La usamos para poder decirle "haz click" desde
  // código, cuando el usuario hace click en toda la cajita, no solo en el
  // input real.
  const inputRef = useRef(null);

  // useState: cada uno de estos es un pedacito de "memoria" del componente.
  // Cuando cambian, React vuelve a dibujar la pantalla automáticamente.
  const [arrastrando, setArrastrando] = useState(false); // ¿el usuario está arrastrando un archivo encima ahora mismo?
  const [cargando, setCargando] = useState(false);       // ¿estamos procesando el archivo en este momento?
  const [error, setError] = useState(null);              // mensaje de error a mostrar (o null si no hay ninguno)

  // Esta es la función principal: se ejecuta cada vez que el usuario
  // selecciona un archivo, ya sea haciendo click o arrastrándolo.
  async function procesarArchivo(file) {
    // Si por alguna razón no llegó ningún archivo, no hacemos nada.
    if (!file) return;

    // PASO 1: Validar la extensión del archivo.
    // La expresión /\.(xlsx|xls)$/i es un "patrón de texto" (regex) que
    // busca que el nombre termine en ".xlsx" o ".xls" (la "i" al final
    // significa que no importa si son mayúsculas o minúsculas).
    const esExcel = /\.(xlsx|xls)$/i.test(file.name);
    if (!esExcel) {
      setError("El archivo debe ser .xlsx o .xls");
      return; // cortamos aquí — no seguimos procesando
    }

    // PASO 2: Validar que el archivo no sea demasiado pesado.
    // file.size viene en bytes, por eso lo comparamos multiplicando
    // los MB por 1024 x 1024 (así se convierten MB a bytes).
    const LIMITE_MB = 10;
    if (file.size > LIMITE_MB * 1024 * 1024) {
      setError(`El archivo pesa demasiado (máximo ${LIMITE_MB}MB). Verifica que sea el archivo correcto.`);
      return;
    }

    // Si llegamos hasta aquí, el archivo pasó las validaciones básicas.
    setError(null);     // limpiamos cualquier error anterior
    setCargando(true);  // mostramos "Procesando archivo…" en pantalla

    try {
      // PASO 3: Aquí es donde realmente se lee el contenido del Excel.
      // "await" significa "espera a que esto termine antes de seguir" —
      // parseExcel puede tardar un poco porque analiza el archivo entero.
      const registros = await parseExcel(file);

      // PASO 4: Si todo salió bien, avisamos a App.jsx pasándole los
      // datos ya procesados y el nombre del archivo (para mostrarlo en
      // el encabezado del dashboard).
      onDatosCargados(registros, file.name);

    } catch (e) {
      // PASO 5: Si parseExcel.js lanzó un error (por ejemplo, "faltan
      // columnas" o "las fechas no son válidas"), lo atrapamos aquí y
      // mostramos su mensaje al usuario en vez de dejar que la app truene.
      setError(e.message || "No se pudo leer el archivo. Verifica que sea el formato correcto.");

    } finally {
      // "finally" se ejecuta SIEMPRE, haya salido bien o mal el try.
      // Aquí apagamos el aviso de "Procesando…".
      setCargando(false);
    }
  }

  // ---------------------------------------------------------------------
  // A partir de aquí: lo que se DIBUJA en pantalla.
  // ---------------------------------------------------------------------
  return (
    <div
      // Estos tres "onDrag/onDrop" son los que permiten ARRASTRAR el
      // archivo directamente encima de la cajita, en vez de tener que
      // hacer click y buscarlo en una ventana.
      onDragOver={(e) => {
        e.preventDefault(); // sin esto, el navegador no dejaría "soltar" el archivo aquí
        setArrastrando(true); // pinta la cajita en verde mientras el archivo está encima
      }}
      onDragLeave={() => setArrastrando(false)} // el archivo salió de la zona sin soltarse
      onDrop={(e) => {
        e.preventDefault();
        setArrastrando(false);
        // e.dataTransfer.files es la lista de archivos soltados;
        // tomamos el primero ([0]) con el símbolo "?." por si viniera vacío.
        procesarArchivo(e.dataTransfer.files?.[0]);
      }}
      // Si el usuario hace click en cualquier parte de la cajita (no solo
      // en el input invisible), simulamos un click en el input real.
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${arrastrando ? "#0F6E56" : "#DAD6C8"}`, // borde punteado, verde si está arrastrando
        borderRadius: 12,
        padding: "48px 24px",
        textAlign: "center",
        cursor: "pointer",
        background: arrastrando ? "#EAF3F0" : "#FFFFFF", // fondo verde clarito al arrastrar
        transition: "border-color 0.15s, background 0.15s", // animación suave del cambio de color
      }}
    >
      {/* Este <input> es el que REALMENTE abre la ventana de "elegir archivo"
          del sistema operativo. Está oculto (display: none) porque preferimos
          que el usuario interactúe con toda la cajita bonita de arriba, no
          con el botón feo por defecto del navegador. */}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls" // le sugiere al explorador de archivos que filtre por estos tipos
        style={{ display: "none" }}
        onChange={(e) => procesarArchivo(e.target.files?.[0])}
      />

      {/* Mientras se está procesando el archivo, mostramos solo este texto... */}
      {cargando ? (
        <p style={{ color: "#6B6858", fontSize: 14 }}>Procesando archivo…</p>
      ) : (
        // ...y si NO se está procesando, mostramos el ícono + instrucciones.
        <>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "#0F6E56" }}>
            {/* Cambia el ícono según si hay algo arrastrándose encima o no */}
            {arrastrando ? <FileSpreadsheet size={32} /> : <Upload size={32} />}
          </div>
          <p style={{ fontWeight: 600, color: "#1E2A38", marginBottom: 4 }}>
            Selecciona o arrastra tu Excel de permisos
          </p>
          <p style={{ fontSize: 13, color: "#6B6858", margin: 0 }}>
            Formatos aceptados: .xlsx, .xls — el archivo no sale de tu dispositivo
          </p>
        </>
      )}

      {/* Si hay algún mensaje de error guardado en el estado, lo mostramos
          en rojo debajo de todo. Si "error" es null, esta línea no dibuja
          nada (así funciona el "&&" en React: si lo de la izquierda es
          falso/null, no muestra lo de la derecha). */}
      {error && (
        <p style={{ color: "#D85A30", fontSize: 13, marginTop: 12 }}>{error}</p>
      )}
    </div>
  );
}