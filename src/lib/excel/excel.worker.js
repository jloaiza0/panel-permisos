// ============================================================================
// excel.worker.js
// ----------------------------------------------------------------------------
// El "ayudante en segundo plano" (Web Worker) que lee el Excel. Corre aparte
// de la página, así que aunque el archivo sea grande la pantalla sigue
// respondiendo. Recibe los bytes del archivo y responde con:
//   { ok: true, registros }   si todo salió bien, o
//   { ok: false, mensaje }    con un mensaje listo para mostrar al usuario.
// ============================================================================
import { leerExcel, cargarXLSX, ErrorArchivo, MENSAJE_GENERAL } from "./parseExcel.js";

self.onmessage = async ({ data: buffer }) => {
  try {
    const registros = leerExcel(buffer, await cargarXLSX());
    self.postMessage({ ok: true, registros });
  } catch (e) {
    // Solo mostramos nuestros propios mensajes; los errores internos de la
    // librería vienen en inglés técnico y no le sirven al usuario.
    self.postMessage({ ok: false, mensaje: e instanceof ErrorArchivo ? e.message : MENSAJE_GENERAL });
  }
};
