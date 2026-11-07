// Pruebas de seguridad y casos borde del lector de Excel.
// Se corren con:  npm test
import { describe, it, expect } from "vitest";
import { deflateRawSync, crc32 } from "node:zlib";
import * as XLSX from "xlsx";
import { leerExcel, ErrorArchivo, MAX_FILAS } from "./parseExcel.js";

// ---------------------------------------------------------------------------
// Ayudantes para fabricar archivos de prueba
// ---------------------------------------------------------------------------
const ENCABEZADOS = ["Fecha", "Nombre", "Concepto", "Tiempo"];
const FECHA = new Date(2025, 2, 14);
const filasValidas = (n) =>
  Array.from({ length: n }, (_, i) => [FECHA, "Persona " + i, "PERSONAL", 0.5]);

function excel(filas) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas, { cellDates: true }), "Hoja1");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

const leer = (buffer) => leerExcel(buffer, XLSX);

// Arma un .zip a mano con una sola entrada, para simular una "zip-bomb".
function zipConUnaEntrada(nombre, contenido) {
  const comprimido = deflateRawSync(contenido);
  const n = Buffer.from(nombre);
  const crc = crc32(contenido);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8);
  local.writeUInt32LE(crc, 14); local.writeUInt32LE(comprimido.length, 18);
  local.writeUInt32LE(contenido.length, 22); local.writeUInt16LE(n.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10); central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(comprimido.length, 20); central.writeUInt32LE(contenido.length, 24);
  central.writeUInt16LE(n.length, 28);
  const inicioCentral = local.length + n.length + comprimido.length;
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(1, 8); fin.writeUInt16LE(1, 10);
  fin.writeUInt32LE(central.length + n.length, 12); fin.writeUInt32LE(inicioCentral, 16);
  return new Uint8Array(Buffer.concat([local, n, comprimido, central, n, fin])).buffer;
}

// Cambia la "dimensión" que el Excel declara (sin agregar datos reales).
function conDimension(buffer, ref) {
  const zip = XLSX.CFB.read(new Uint8Array(buffer), { type: "array" });
  const hoja = zip.FileIndex[zip.FullPaths.indexOf("Root Entry/xl/worksheets/sheet1.xml")];
  hoja.content = Buffer.from(
    Buffer.from(hoja.content).toString().replace(/<dimension ref="[^"]+"\/>/, `<dimension ref="${ref}"/>`)
  );
  return XLSX.CFB.write(zip, { type: "array", fileType: "zip" });
}

// ---------------------------------------------------------------------------
// Pruebas
// ---------------------------------------------------------------------------
describe("archivos válidos", () => {
  it("lee un Excel correcto", () => {
    const r = leer(excel([ENCABEZADOS, ...filasValidas(30)]));
    expect(r).toHaveLength(30);
    expect(r[0]).toEqual({
      id: 0, fecha: "2025-03-14", anio: 2025, mes: "Mar",
      nombre: "Persona 0", concepto: "PERSONAL", tiempoMin: 720,
    });
  });

  it("interpreta fechas guardadas como número de serie", () => {
    const r = leer(excel([ENCABEZADOS, ...filasValidas(20), [45730, "Juan Pérez", "X", 1]]));
    expect(r.at(-1).fecha).toBe("2025-03-14");
  });
});

describe("archivos inválidos se rechazan con mensaje propio", () => {
  it.each([
    ["vacío", new ArrayBuffer(0)],
    ["sin columnas requeridas", excel([["a", "b"], [1, 2]])],
    ["solo encabezados", excel([ENCABEZADOS])],
    ["bytes basura", new Uint8Array(5000).map((_, i) => (i * 37) % 251).buffer],
  ])("%s", (_, buffer) => {
    expect(() => leer(buffer)).toThrow(ErrorArchivo);
  });

  it("HTML disfrazado de Excel lanza error (FileUploader muestra el mensaje general)", () => {
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>").buffer;
    expect(() => leer(html)).toThrow(Error);
  });
});

describe("contenido hostil", () => {
  it("guarda HTML y fórmulas como texto plano", () => {
    const r = leer(excel([ENCABEZADOS, ...filasValidas(20),
      [FECHA, "<img src=x onerror=alert(1)>", "X", 1],
      [FECHA, '=HYPERLINK("http://evil")', "Y", 1]]));
    expect(r.at(-2).nombre).toBe("<img src=x onerror=alert(1)>");
    expect(r.at(-1).nombre).toBe('=HYPERLINK("http://evil")');
  });

  it("no contamina Object.prototype con nombres como __proto__", () => {
    const r = leer(excel([ENCABEZADOS, ...filasValidas(20),
      [FECHA, "__proto__", "__proto__", 1], [FECHA, "constructor", "constructor", 1]]));
    expect(r.map((x) => x.nombre)).toContain("__proto__");
    expect({}.polluted).toBeUndefined();
    expect(Object.getOwnPropertyNames(Object.prototype)).not.toContain("polluted");
  });

  it("descarta tiempos negativos o absurdos", () => {
    const r = leer(excel([ENCABEZADOS, ...filasValidas(20),
      [FECHA, "Juan Pérez", "X", -5], [FECHA, "Ana Ruiz", "X", 1e9]]));
    expect(r.slice(-2).map((x) => x.tiempoMin)).toEqual([null, null]);
  });
});

describe("protección contra archivos que congelan la pestaña", () => {
  it("una dimensión falsa de 1 millón de filas no lo congela", () => {
    const archivo = conDimension(excel([ENCABEZADOS, ...filasValidas(20)]), "A1:D1048576");
    const t0 = performance.now();
    expect(leer(archivo)).toHaveLength(20);
    expect(performance.now() - t0).toBeLessThan(2000);
  });

  it("una dimensión falsa de 16.384 columnas no lo congela", () => {
    const archivo = conDimension(excel([ENCABEZADOS, ...filasValidas(20)]), "A1:XFD21");
    const t0 = performance.now();
    expect(leer(archivo)).toHaveLength(20);
    expect(performance.now() - t0).toBeLessThan(2000);
  });

  it(`rechaza más de ${MAX_FILAS} filas reales`, () => {
    const archivo = excel([ENCABEZADOS, ...filasValidas(MAX_FILAS + 10)]);
    expect(() => leer(archivo)).toThrow(/demasiadas filas/);
  }, 120000);

  it("rechaza una zip-bomb sin descomprimirla", () => {
    // ~300 KB comprimido que se inflaría a 310 MB.
    const bomba = zipConUnaEntrada("xl/worksheets/sheet1.xml", Buffer.alloc(310 * 1024 * 1024, 0x41));
    const t0 = performance.now();
    expect(() => leer(bomba)).toThrow(/demasiado grande/);
    expect(performance.now() - t0).toBeLessThan(500);
  }, 60000);
});
