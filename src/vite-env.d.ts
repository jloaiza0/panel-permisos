/// <reference types="vite/client" />

// Versión de package.json, inyectada por vite.config.js (define).
declare const __APP_VERSION__: string;

/** Un permiso ya leído del Excel (lo arma lib/excel/parseExcel.js). */
interface Registro {
  id: number;
  /** "AAAA-MM-DD" */
  fecha: string;
  anio: number;
  /** "Ene" … "Dic" */
  mes: string;
  nombre: string;
  concepto: string;
  /** Duración en minutos, o null si el Excel no la trae. */
  tiempoMin: number | null;
}

/** Filtros de arriba del dashboard ("Todos" = sin filtrar). */
interface Filtros {
  anio: number | "Todos";
  concepto: string;
  mes: string;
}
