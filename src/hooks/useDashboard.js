// ============================================================================
// useDashboard.js
// ----------------------------------------------------------------------------
// La "memoria" del dashboard: los filtros de arriba (año, concepto, mes) y
// todo lo que se calcula a partir de ellos. Los cálculos viven en
// lib/estadisticas.js; aquí solo se guardan en useMemo para que se repitan
// únicamente cuando cambian los datos o un filtro.
// ============================================================================
import { useCallback, useMemo, useState } from "react";
import {
  TODOS, valoresUnicos, filtrar, calcKpis, kpisAnioAnterior, contarPorMes, contarPor,
} from "../lib/estadisticas.js";

/** @type {Filtros} */
const FILTROS_INICIALES = { anio: TODOS, concepto: TODOS, mes: TODOS };

/** @param {Registro[]} datos */
export function useDashboard(datos) {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const cambiarFiltro = useCallback(
    /** @type {<K extends keyof Filtros>(campo: K, valor: Filtros[K]) => void} */
    (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor })),
    []
  );
  const limpiarFiltros = useCallback(() => setFiltros(FILTROS_INICIALES), []);

  const anios = useMemo(() => valoresUnicos(datos, "anio"), [datos]);
  const conceptos = useMemo(() => valoresUnicos(datos, "concepto"), [datos]);
  const personas = useMemo(() => valoresUnicos(datos, "nombre"), [datos]);

  // Los registros que quedan tras aplicar los tres filtros a la vez. Casi
  // todo el dashboard se calcula desde aquí.
  const filtrado = useMemo(() => filtrar(datos, filtros), [datos, filtros]);

  const kpis = useMemo(() => calcKpis(filtrado), [filtrado]);
  const kpisPrev = useMemo(() => kpisAnioAnterior(datos, filtros), [datos, filtros]);
  const porMes = useMemo(() => contarPorMes(filtrado), [filtrado]);
  const porConcepto = useMemo(() => contarPor(filtrado, "concepto"), [filtrado]);
  const topPersonas = useMemo(() => contarPor(filtrado, "nombre", 10), [filtrado]);

  return {
    filtros, cambiarFiltro, limpiarFiltros,
    anios, conceptos, personas,
    filtrado, kpis, kpisPrev, porMes, porConcepto, topPersonas,
  };
}
