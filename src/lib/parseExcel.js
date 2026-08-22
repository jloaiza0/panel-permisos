import * as XLSX from "xlsx";

// Convierte un valor de tiempo de Excel (fracción de día u objeto Date) a minutos
function tiempoAMinutos(valor) {
  if (valor == null || valor === "") return null;
  if (typeof valor === "number") {
    // Excel guarda las horas como fracción de un día (0.5 = 12:00)
    return Math.round(valor * 24 * 60);
  }
  if (valor instanceof Date) {
    return valor.getHours() * 60 + valor.getMinutes();
  }
  return null;
}

function normalizarConcepto(valor) {
  const c = (valor || "").toString().trim();
  if (c.toLowerCase() === "compensatorio") return "Compensatorio";
  return c;
}

const MESES_ABREV = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function excelFechaAPartes(valor) {
  let y, m, d;
  if (valor instanceof Date) {
    y = valor.getFullYear();
    m = valor.getMonth() + 1;
    d = valor.getDate();
  } else if (typeof valor === "number") {
    const parsed = XLSX.SSF.parse_date_code(valor);
    if (!parsed) return null;
    y = parsed.y; m = parsed.m; d = parsed.d;
  } else {
    return null;
  }
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { iso, anio: y, mes: MESES_ABREV[m - 1] };
}

function headerIncluye(headers, palabra) {
  return headers.findIndex(h => h.includes(palabra));
}

/**
 * Ubica el índice de cada columna requerida buscando por su nombre real
 * en el encabezado (no por posición fija). Lanza error si falta alguna
 * o si hay encabezados ambiguos/duplicados.
 */
function ubicarColumnas(filas) {
  if (!filas || filas.length < 2) {
    throw new Error("El archivo está vacío o no tiene registros.");
  }

  const headers = (filas[0] || []).map(h => (h || "").toString().trim().toLowerCase());

  const idxFecha = headerIncluye(headers, "fecha");
  const idxNombre = headerIncluye(headers, "nombre");
  const idxConcepto = headerIncluye(headers, "conc"); // tolerante a "concepto", "concpeto", etc.
  const idxTiempo = headerIncluye(headers, "tiempo");

  const faltantes = [];
  if (idxFecha === -1) faltantes.push("Fecha");
  if (idxNombre === -1) faltantes.push("Nombre");
  if (idxConcepto === -1) faltantes.push("Concepto");

  if (faltantes.length > 0) {
    throw new Error(
      `El archivo no tiene el formato esperado. Faltan las columnas: ${faltantes.join(", ")}.`
    );
  }

  return { idxFecha, idxNombre, idxConcepto, idxTiempo };
}

/**
 * Revisa una muestra de filas para confirmar que el CONTENIDO de cada
 * columna corresponde a lo que dice su encabezado (no solo el nombre).
 */
function validarContenido(filas, cols) {
  const muestra = filas.slice(1, Math.min(filas.length, 21)); // hasta 20 filas de muestra
  if (muestra.length === 0) {
    throw new Error("El archivo no tiene filas de datos para validar.");
  }

  let fechasValidas = 0;
  let nombresValidos = 0;

  muestra.forEach(fila => {
    const valFecha = fila[cols.idxFecha];
    const valNombre = fila[cols.idxNombre];

    if (valFecha instanceof Date || (typeof valFecha === "number" && valFecha > 20000 && valFecha < 90000)) {
      fechasValidas++;
    }
    if (typeof valNombre === "string" && valNombre.trim().length >= 3 && /[a-zA-Záéíóúñ]/.test(valNombre)) {
      nombresValidos++;
    }
  });

  if (fechasValidas / muestra.length < 0.7) {
    throw new Error(
      "La columna de Fecha no contiene fechas válidas. Verifica que el archivo sea el correcto."
    );
  }
  if (nombresValidos / muestra.length < 0.7) {
    throw new Error(
      "La columna de Nombre no contiene nombres de personas válidos. Verifica que el archivo sea el correcto."
    );
  }
}

/**
 * Lee un archivo Excel (File del input) y devuelve un arreglo de registros
 * normalizados: { fecha, anio, mes, nombre, concepto, tiempoMin }
 */
export async function parseExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: null });

  const cols = ubicarColumnas(filas);
  validarContenido(filas, cols);

  // Fila 0 = encabezados, se ignora
  const registros = [];
  let filasConDatos = 0;
  for (let i = 1; i < filas.length; i++) {
    const fila = filas[i];
    const fecha = fila[cols.idxFecha];
    const nombre = fila[cols.idxNombre];
    const concepto = fila[cols.idxConcepto];
    const tiempo = cols.idxTiempo !== -1 ? fila[cols.idxTiempo] : null;

    if (!fecha || !nombre) continue;
    filasConDatos++;

    const partes = excelFechaAPartes(fecha);
    if (!partes) continue;

    registros.push({
      fecha: partes.iso,
      anio: partes.anio,
      mes: partes.mes,
      nombre: (nombre || "").toString().trim(),
      concepto: normalizarConcepto(concepto),
      tiempoMin: tiempoAMinutos(tiempo),
    });
  }

  if (registros.length === 0) {
    throw new Error(
      "No se encontraron registros válidos. Verifica que la columna de Fecha tenga fechas reales."
    );
  }

  // Si más de la mitad de filas con datos se descartaron por fecha inválida, algo está mal
  if (filasConDatos > 0 && registros.length / filasConDatos < 0.5) {
    throw new Error(
      "Muchas filas tienen fechas inválidas. Revisa el formato de la columna Fecha en el Excel."
    );
  }

  return registros;
}