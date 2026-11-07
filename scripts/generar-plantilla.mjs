// Genera public/plantilla-permisos.xlsx: un Excel de ejemplo con el formato
// que espera el panel (datos ficticios). Se corre con:
//   node scripts/generar-plantilla.mjs
import * as XLSX from "xlsx";
import { writeFileSync } from "node:fs";

const filas = [
  ["Fecha", "Nombre", "Concepto", "Tiempo"],
  [new Date(2025, 0, 13), "Ana Gómez", "PERSONAL", "02:00"],
  [new Date(2025, 0, 20), "Luis Herrera", "CITA MÉDICA", "03:30"],
  [new Date(2025, 1, 4), "Ana Gómez", "ESTUDIO", "04:00"],
  [new Date(2025, 1, 18), "Marta Ríos", "COMPENSATORIO", "08:00"],
  [new Date(2025, 2, 9), "Luis Herrera", "C VOTACION", "04:00"],
  [new Date(2025, 2, 21), "Marta Ríos", "PERSONAL", "01:30"],
];

// "Tiempo" se guarda como hora de Excel (fracción del día), igual que en
// el archivo real.
const hoja = XLSX.utils.aoa_to_sheet(
  filas.map((f, i) => (i === 0 ? f : [f[0], f[1], f[2], horaExcel(f[3])])),
  { cellDates: true }
);
for (let r = 2; r <= filas.length; r++) {
  hoja[`A${r}`].z = "dd/mm/yyyy";
  hoja[`D${r}`].z = "hh:mm";
}
hoja["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 8 }];

const libro = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(libro, hoja, "Permisos");
writeFileSync(new URL("../public/plantilla-permisos.xlsx", import.meta.url), XLSX.write(libro, { type: "buffer", bookType: "xlsx" }));
console.log("Plantilla creada en public/plantilla-permisos.xlsx");

function horaExcel(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h * 60 + m) / 1440;
}
