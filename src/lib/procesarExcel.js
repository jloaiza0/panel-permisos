// ============================================================================
// procesarExcel.js
// ----------------------------------------------------------------------------
// La función que usa FileUploader.jsx para leer el Excel.
//
// Leer un Excel grande puede tardar varios segundos. Si lo hiciéramos en la
// página misma, se congelaría todo ese tiempo (no responde a clics ni
// scroll). Por eso lo mandamos a un "Web Worker": un ayudante que trabaja en
// segundo plano (ver excel.worker.js), que a su vez usa leerExcel() de
// parseExcel.js. Si tarda más de TIEMPO_MAXIMO_MS lo cancelamos, así un
// archivo manipulado no deja la pestaña colgada.
//
// Va en un archivo aparte de parseExcel.js porque el worker importa
// parseExcel.js: si ese archivo también creara el worker, el worker se
// intentaría incluir a sí mismo.
// ============================================================================
import { leerExcel, cargarXLSX, ErrorArchivo, MENSAJE_GENERAL, TIEMPO_MAXIMO_MS } from "./parseExcel.js";

// "async" significa que esta función hace cosas que toman tiempo y por eso
// se debe usar con "await" desde donde se llama.
export async function parseExcel(file) {
  const buffer = await file.arrayBuffer();

  // Navegadores muy viejos sin Workers: leemos aquí mismo (más lento, pero
  // funciona).
  if (typeof Worker === "undefined") {
    try {
      return leerExcel(buffer, await cargarXLSX());
    } catch (e) {
      throw e instanceof ErrorArchivo ? e : new ErrorArchivo(MENSAJE_GENERAL);
    }
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./excel.worker.js", import.meta.url), { type: "module" });
    const terminar = (accion) => { clearTimeout(reloj); worker.terminate(); accion(); };

    const reloj = setTimeout(() => terminar(() => reject(new ErrorArchivo(
      "El archivo tardó demasiado en procesarse. Verifica que sea el archivo correcto."
    ))), TIEMPO_MAXIMO_MS);

    worker.onmessage = ({ data }) => terminar(() =>
      data.ok ? resolve(data.registros) : reject(new ErrorArchivo(data.mensaje))
    );
    // Si el worker se cae (p. ej. se quedó sin memoria), mensaje general.
    worker.onerror = () => terminar(() => reject(new ErrorArchivo(MENSAJE_GENERAL)));

    // "[buffer]" le entrega los bytes al worker sin copiarlos.
    worker.postMessage(buffer, [buffer]);
  });
}
