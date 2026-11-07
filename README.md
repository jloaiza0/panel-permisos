# Panel de ausentismo

Dashboard para analizar los permisos del personal a partir de un Excel.
Subes el archivo y ves totales, horas, tendencias por mes, comparación entre
años, el top 10 de personas y el historial de cada una.

**El archivo nunca sale de tu equipo**: todo se procesa en el navegador. No
hay servidor ni base de datos.

## Formato del Excel

La primera hoja debe tener una fila de encabezados con estas columnas (en
cualquier orden; se buscan por nombre, sin importar mayúsculas):

| Columna    | Obligatoria | Contenido                                   |
|------------|-------------|---------------------------------------------|
| `Fecha`    | Sí          | Fecha del permiso                           |
| `Nombre`   | Sí          | Nombre de la persona                        |
| `Concepto` | Sí          | Tipo de permiso (PERSONAL, CITA MÉDICA, …)  |
| `Tiempo`   | No          | Duración en formato de hora de Excel        |

Límites: 10 MB, 100.000 filas.

## Uso

```bash
npm install
npm run dev       # servidor local en http://localhost:5173/panel-permisos/
npm test          # pruebas
npm run lint      # revisión de código
npm run deploy    # pasa lint y pruebas, compila y publica en GitHub Pages
```

## Estructura

```
src/
  main.jsx              arranque + protección anti-clickjacking
  App.jsx               elige pantalla: carga o dashboard
  Dashboard.jsx         layout del dashboard (se descarga aparte)
  constants/            meses y colores de las gráficas
  lib/
    excel/              lectura segura del Excel (Web Worker, límites, zip-bomb)
    estadisticas.js     todos los cálculos (KPIs, agrupaciones, búsqueda)
    formato.js          números, horas y fechas en formato colombiano
  hooks/                useDashboard (filtros + cálculos), useNarrow
  components/
    ui/                 Section, KpiCard, MiniStat, YearSelector, ThemeToggle, ErrorBoundary
    charts/             Grafica, ChartTooltip, PeakLabel, chartTheme
    FileUploader.jsx    zona para subir el Excel
  sections/             cada bloque visual del dashboard
  styles/index.css      tokens de diseño (claro/oscuro) y estilos
```

## Seguridad

- Política CSP estricta (solo scripts propios, sin conexiones externas).
- Bloqueo de la página dentro de marcos de otros sitios.
- El Excel se lee en un Web Worker con tiempo máximo, límite de filas y
  columnas, y detección de archivos comprimidos maliciosos (zip-bomb).
- Los textos del Excel se muestran siempre como texto plano.

## Tecnologías

React 19, Vite, Recharts, SheetJS (xlsx), Vitest y Oxlint.
