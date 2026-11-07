// Registros de ejemplo para las pruebas, con la misma forma que produce
// lib/excel/parseExcel.js.
import { MESES } from "../constants/meses.js";

let id = 0;
export function registro(fecha, nombre, concepto, tiempoMin = 60) {
  const [anio, m] = fecha.split("-").map(Number);
  return { id: id++, fecha, anio, mes: MESES[m - 1], nombre, concepto, tiempoMin };
}

export const DATOS = [
  registro("2024-01-10", "José Pérez", "PERSONAL", 120),
  registro("2024-03-02", "Ana Ruiz", "ESTUDIO", 60),
  registro("2025-01-15", "José Pérez", "PERSONAL", 30),
  registro("2025-01-20", "José Pérez", "CITA MÉDICA", null),
  registro("2025-02-01", "Álvaro Díaz", "PERSONAL", 90),
  registro("2025-03-05", "Ana Ruiz", "PERSONAL", 60),
];
