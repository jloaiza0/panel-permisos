// Pruebas de cómo se lanza el Web Worker que lee el Excel: respuesta
// correcta, errores, tiempo máximo y la política de Trusted Types.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorArchivo, MENSAJE_GENERAL, TIEMPO_MAXIMO_MS } from "./parseExcel.js";

// Worker falso: guarda lo que recibe y responde con lo que diga "respuesta".
let ultimo;
function workerFalso(respuesta) {
  return class {
    constructor(url, opciones) {
      this.url = url;
      this.opciones = opciones;
      this.terminate = vi.fn();
      ultimo = this;
    }
    postMessage(buffer) {
      this.recibido = buffer;
      respuesta?.(this);
    }
  };
}

const archivo = () => ({ arrayBuffer: async () => new ArrayBuffer(8) });
const cargar = async () => (await import("./procesarExcel.js")).parseExcel;

beforeEach(() => { vi.resetModules(); ultimo = undefined; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("parseExcel con Web Worker", () => {
  it("devuelve los registros que manda el worker y lo cierra", async () => {
    vi.stubGlobal("Worker", workerFalso((w) => w.onmessage({ data: { ok: true, registros: [{ id: 0 }] } })));
    const parseExcel = await cargar();
    await expect(parseExcel(archivo())).resolves.toEqual([{ id: 0 }]);
    expect(ultimo.opciones).toEqual({ type: "module" });
    expect(ultimo.recibido.byteLength).toBe(8);
    expect(ultimo.terminate).toHaveBeenCalled();
  });

  it("muestra el mensaje de error que manda el worker", async () => {
    vi.stubGlobal("Worker", workerFalso((w) => w.onmessage({ data: { ok: false, mensaje: "Faltan columnas" } })));
    const parseExcel = await cargar();
    await expect(parseExcel(archivo())).rejects.toThrow(new ErrorArchivo("Faltan columnas"));
  });

  it("si el worker se cae, da el mensaje general", async () => {
    vi.stubGlobal("Worker", workerFalso((w) => w.onerror(new Event("error"))));
    const parseExcel = await cargar();
    await expect(parseExcel(archivo())).rejects.toThrow(MENSAJE_GENERAL);
  });

  it("cancela el worker si tarda demasiado", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("Worker", workerFalso(null)); // nunca responde
    const parseExcel = await cargar();
    const error = parseExcel(archivo()).catch((e) => e);
    await vi.advanceTimersByTimeAsync(TIEMPO_MAXIMO_MS + 1);
    expect(await error).toBeInstanceOf(Error); // (resetModules crea otra clase ErrorArchivo)
    expect((await error).message).toMatch(/tardó demasiado/);
    expect(ultimo.terminate).toHaveBeenCalled();
  });

  it("con Trusted Types crea el worker por la política, que solo acepta su dirección", async () => {
    let reglas;
    vi.stubGlobal("trustedTypes", {
      createPolicy: vi.fn((nombre, r) => { reglas = r; return { createScriptURL: (u) => ({ confiable: r.createScriptURL(u) }) }; }),
    });
    vi.stubGlobal("Worker", workerFalso((w) => w.onmessage({ data: { ok: true, registros: [] } })));
    const parseExcel = await cargar();
    await parseExcel(archivo());

    expect(globalThis.trustedTypes.createPolicy).toHaveBeenCalledWith("excel-worker", expect.any(Object));
    expect(ultimo.url).toHaveProperty("confiable");
    expect(() => reglas.createScriptURL("https://otro-sitio.com/malo.js")).toThrow(TypeError);
  });
});

describe("parseExcel sin Web Worker", () => {
  it("lee en la página y deja pasar los mensajes propios", async () => {
    vi.stubGlobal("Worker", undefined);
    const parseExcel = await cargar();
    await expect(parseExcel(archivo())).rejects.toThrow(/vacío/);
  });

  it("convierte errores internos de la librería en el mensaje general", async () => {
    vi.stubGlobal("Worker", undefined);
    const parseExcel = await cargar();
    // Empieza como un zip ("PK") pero está dañado: la librería falla.
    const zipDanado = new Uint8Array(200).fill(7);
    zipDanado.set([0x50, 0x4b, 0x03, 0x04]);
    await expect(parseExcel({ arrayBuffer: async () => zipDanado.buffer })).rejects.toThrow(MENSAJE_GENERAL);
  });
});
