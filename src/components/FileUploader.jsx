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

import { useEffect, useRef, useState } from "react";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react"; // iconos
import { parseExcel } from "../lib/excel/procesarExcel.js"; // lee el Excel en segundo plano (Web Worker)
import { ErrorArchivo, MENSAJE_GENERAL } from "../lib/excel/parseExcel.js";

// "onDatosCargados" es una FUNCIÓN que este componente recibe desde afuera
// (desde App.jsx). Es la forma en que React permite que un componente hijo
// "hable" con su padre: cuando el archivo ya está listo, este componente
// simplemente llama a onDatosCargados(...) y App.jsx se entera.
/**
 * @param {{ onDatosCargados: (registros: Registro[], nombreArchivo: string) => void }} props
 */
export default function FileUploader({ onDatosCargados }) {

  // useRef: una "referencia" directa a la etiqueta <input> de más abajo
  // (la que está oculta). La usamos para poder decirle "haz click" desde
  // código, cuando el usuario hace click en toda la cajita, no solo en el
  // input real.
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  // useState: cada uno de estos es un pedacito de "memoria" del componente.
  // Cuando cambian, React vuelve a dibujar la pantalla automáticamente.
  const [arrastrando, setArrastrando] = useState(false); // ¿el usuario está arrastrando un archivo encima ahora mismo?
  const [cargando, setCargando] = useState(false);       // ¿estamos procesando el archivo en este momento?
  const [error, setError] = useState(/** @type {string | null} */ (null));              // mensaje de error a mostrar (o null si no hay ninguno)
  const [intentosFallidos, setIntentosFallidos] = useState(0); // cuenta errores, para sacudir la cajita CADA vez (aunque el mensaje sea el mismo)
  const zonaRef = useRef(/** @type {HTMLDivElement | null} */ (null)); // referencia a la cajita, para animarla

  // Muestra un error y cuenta el intento fallido.
  /** @param {string} mensaje */
  function fallar(mensaje) {
    setError(mensaje);
    setIntentosFallidos(n => n + 1);
  }

  // Cada vez que hay un error nuevo, la cajita hace una sacudida corta
  // (como un "no" con la cabeza): avisa que algo falló aunque no estés
  // mirando el texto rojo. Se usa la Web Animations API (.animate), que
  // corre fuera del hilo principal. Si el usuario pidió "reducir
  // movimiento", no se sacude: el mensaje y su anuncio bastan.
  useEffect(() => {
    if (intentosFallidos === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    zonaRef.current?.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(5px)" },
        { transform: "translateX(-3px)" },
        { transform: "translateX(2px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 320, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
    );
  }, [intentosFallidos]);

  // Esta es la función principal: se ejecuta cada vez que el usuario
  // selecciona un archivo, ya sea haciendo click o arrastrándolo.
  /** @param {File | undefined} file */
  async function procesarArchivo(file) {
    // Si por alguna razón no llegó ningún archivo, no hacemos nada.
    if (!file) return;

    // PASO 1: Validar la extensión del archivo.
    // La expresión /\.(xlsx|xls)$/i es un "patrón de texto" (regex) que
    // busca que el nombre termine en ".xlsx" o ".xls" (la "i" al final
    // significa que no importa si son mayúsculas o minúsculas).
    const esExcel = /\.(xlsx|xls)$/i.test(file.name);
    if (!esExcel) {
      fallar("El archivo debe ser .xlsx o .xls");
      return; // cortamos aquí — no seguimos procesando
    }

    // PASO 2: Validar que el archivo no sea demasiado pesado.
    // file.size viene en bytes, por eso lo comparamos multiplicando
    // los MB por 1024 x 1024 (así se convierten MB a bytes).
    const LIMITE_MB = 10;
    if (file.size > LIMITE_MB * 1024 * 1024) {
      fallar(`El archivo pesa demasiado (máximo ${LIMITE_MB}MB). Verifica que sea el archivo correcto.`);
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
      // Solo mostramos mensajes escritos por nosotros (ErrorArchivo); un
      // error interno del navegador vendría en inglés técnico.
      fallar(e instanceof ErrorArchivo ? e.message : MENSAJE_GENERAL);

    } finally {
      // "finally" se ejecuta SIEMPRE, haya salido bien o mal el try.
      // Aquí apagamos el aviso de "Procesando…".
      setCargando(false);
    }
  }

  // ---------------------------------------------------------------------
  // A partir de aquí: lo que se DIBUJA en pantalla.
  // Los estilos viven en index.css (clase .dropzone).
  // ---------------------------------------------------------------------
  return (
    <div
      ref={zonaRef}
      className="dropzone"
      // role="button" + tabIndex={0}: la cajita se puede enfocar con Tab y
      // activar con Enter o Espacio, igual que un botón normal. Sin esto,
      // quien navega solo con teclado no podía subir el archivo.
      role="button"
      tabIndex={0}
      // Sin aria-label: el lector de pantalla lee exactamente el texto que
      // se ve dentro de la cajita (título, formatos y error). Así quien usa
      // control por voz puede decir "clic en Selecciona o arrastra…".
      aria-busy={cargando}
      data-dragging={arrastrando}
      data-busy={cargando}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      // Estos tres "onDrag/onDrop" permiten ARRASTRAR el archivo encima
      // de la cajita en vez de buscarlo en una ventana.
      onDragOver={(e) => {
        e.preventDefault(); // sin esto, el navegador no deja "soltar" el archivo aquí
        setArrastrando(true); // pinta la cajita en verde mientras el archivo está encima
      }}
      // Solo cuenta como "salió" si el puntero dejó la cajita entera: al pasar
      // sobre el ícono o el texto de adentro el navegador también dispara
      // dragleave, y sin esta revisión el verde parpadeaba.
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(/** @type {Node | null} */ (e.relatedTarget))) setArrastrando(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setArrastrando(false);
        procesarArchivo(e.dataTransfer.files?.[0]);
      }}
      // Click en cualquier parte de la cajita = click en el input real.
      onClick={() => { if (!cargando) inputRef.current?.click(); }}
    >
      {/* El <input> real que abre la ventana de "elegir archivo". Está
          oculto porque el usuario interactúa con la cajita de arriba. */}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        tabIndex={-1}
        style={{ display: "none" }}
        onChange={(e) => {
          procesarArchivo(e.target.files?.[0]);
          e.target.value = ""; // permite volver a elegir el MISMO archivo después de un error
        }}
      />

      {cargando ? (
        // Mientras se procesa: spinner + texto (aria-live avisa a lectores de pantalla)
        <div aria-live="polite" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "var(--brand)" }}>
          <Loader2 size={28} className="spin" aria-hidden="true" />
          <p id="dropzone-titulo" style={{ color: "var(--ink-2)", fontSize: 14 }}>Procesando archivo…</p>
        </div>
      ) : (
        <>
          {/* dz-icon: al arrastrar un archivo encima, el ícono se levanta
              un poco (ver index.css), como diciendo "suéltalo aquí". */}
          <div className="dz-icon" style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--brand)" }}>
            {/* Cambia el ícono según si hay algo arrastrándose encima */}
            {arrastrando ? <FileSpreadsheet size={32} aria-hidden="true" /> : <Upload size={32} aria-hidden="true" />}
          </div>
          <p id="dropzone-titulo" style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
            {arrastrando ? "Suelta el archivo para cargarlo" : "Selecciona o arrastra tu Excel de permisos"}
          </p>
          <p id="dropzone-ayuda" style={{ fontSize: 13, color: "var(--ink-2)" }}>
            Formatos aceptados: .xlsx y .xls · máximo 10 MB
          </p>
        </>
      )}

      {/* role="alert": el lector de pantalla anuncia el error apenas aparece */}
      {error && (
        <p id="dropzone-error" role="alert" className="dropzone-error">{error}</p>
      )}
    </div>
  );
}
