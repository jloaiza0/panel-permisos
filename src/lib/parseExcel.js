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

/**
 * Lee un archivo Excel (File del input) y devuelve un arreglo de registros
 * normalizados: { fecha, anio, mes, nombre, concepto, tiempoMin }
 */
export async function parseExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: null });

  // Fila 0 = encabezados, se ignora
  const registros = [];
  for (let i = 1; i < filas.length; i++) {
    const fila = filas[i];
    const [fecha, , , nombre, concepto, , horaInicio, horaFin, tiempo] = fila;

    if (!fecha || !nombre) continue;

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

  return registros;
}
