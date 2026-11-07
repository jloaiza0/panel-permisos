# Arquitectura

## Flujo de datos

```mermaid
flowchart LR
  A[Excel elegido] --> B[FileUploader<br/>valida nombre y tamaño]
  B --> C[procesarExcel.js<br/>lanza el Web Worker]
  C --> D[excel.worker.js]
  D --> E[parseExcel.js<br/>zip-bomb, límites,<br/>columnas, fechas]
  E -->|Registro[]| F[App.jsx]
  F --> G[Dashboard.jsx<br/>carga diferida]
  G --> H[useDashboard<br/>filtros + useMemo]
  H --> I[estadisticas.js<br/>cálculos puros]
  H --> J[sections/*<br/>dibujan]
```

1. **Lectura** (`lib/excel/`): el archivo se lee en un Web Worker para que la
   página no se congele. `parseExcel.js` revisa el archivo antes de abrirlo,
   busca las columnas por nombre, valida una muestra y devuelve una lista de
   `Registro` (tipo en `src/vite-env.d.ts`).
2. **Estado** (`hooks/useDashboard.js`): guarda los filtros (año, concepto,
   mes) y memoriza los cálculos para repetirlos solo cuando algo cambia.
3. **Cálculos** (`lib/estadisticas.js`): funciones puras sin React. Toda la
   lógica de negocio está aquí y tiene pruebas propias.
4. **Pantalla** (`sections/`): cada bloque del dashboard es un archivo. Las
   piezas que se repiten están en `components/ui` y `components/charts`.

## Reglas del proyecto

- **Lógica fuera de los componentes.** Un cálculo nuevo va en
  `lib/estadisticas.js` con su prueba; el componente solo lo dibuja.
- **Colores por variables CSS.** Las gráficas usan `var(--s1)` etc.
  (`constants/colores.js`), así el modo oscuro funciona sin recalcular.
  Cada concepto tiene un color fijo.
- **Una sola fuente de verdad.** Meses en `constants/meses.js`, ajustes de
  gráficas en `components/charts/chartTheme.js`, tokens de diseño en
  `styles/index.css`.
- **Accesibilidad desde el inicio.** Botones con `aria-pressed`, cada gráfica
  dentro de `<Grafica descripcion=...>`, cambios anunciados con `role="status"`.
- **Nada sale del navegador.** No agregar servicios externos: la CSP los
  bloquearía (`connect-src 'self'`).

## Rendimiento

| Archivo | Cuándo se descarga |
|---|---|
| `index-*.js` (~207 KB) | Al abrir la página: React y la pantalla de carga |
| `Dashboard-*.js` (~412 KB) | En segundo plano mientras eliges el archivo (incluye Recharts) |
| `excel.worker-*.js` (~498 KB) | Al subir un archivo (incluye SheetJS) |

## Pruebas

| Archivo | Qué cubre |
|---|---|
| `lib/estadisticas.test.js` | Filtros, KPIs, agrupaciones, búsqueda |
| `lib/formato.test.js` | Números, horas y fechas en formato local |
| `lib/excel/parseExcel.test.js` | Archivos válidos, inválidos y maliciosos |
| `lib/excel/procesarExcel.test.js` | Web Worker, tiempo máximo, Trusted Types |
| `App.test.jsx` | Recorrido completo: subir, ver, volver |
| `Dashboard.test.jsx` | Filtros, comparativos, resumen por persona |
| `sections/ConsultaPersona.test.jsx` | Búsqueda y límite de filas |
| `components/**.test.jsx` | Zona de carga, tema, tarjetas, tooltip |
| `a11y.test.jsx` | Auditoría axe-core (WCAG 2.2 AA) de cada pantalla y estado |
