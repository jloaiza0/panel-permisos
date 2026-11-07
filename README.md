# Panel de ausentismo

[![CI](https://github.com/jloaiza0/panel-permisos/actions/workflows/ci.yml/badge.svg)](https://github.com/jloaiza0/panel-permisos/actions/workflows/ci.yml)

Dashboard para analizar los permisos del personal a partir de un Excel.
Subes el archivo y ves totales, horas, tendencias por mes, comparación entre
años, el top 10 de personas y el historial de cada una.

**Abrir el panel:** https://jloaiza0.github.io/panel-permisos/

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

Límites: 10 MB, 100.000 filas. En la pantalla de carga hay un botón para
descargar una **plantilla de ejemplo** (`public/plantilla-permisos.xlsx`).

## Uso

Requiere Node.js 22.12 o superior (ver `.nvmrc`).

```bash
npm install
npm run dev            # servidor local en http://localhost:5173/panel-permisos/
npm test               # pruebas
npm run test:coverage  # pruebas + cobertura (mínimo 90 % de líneas)
npm run lint           # revisión de código
npm run typecheck      # revisión de tipos de la lógica
npm run check          # todo lo anterior + build (lo mismo que corre el CI)
npm run deploy         # pasa lint, tipos y pruebas, compila y publica en GitHub Pages
```

## Estructura

```
src/
  main.jsx              arranque + protección anti-clickjacking
  App.jsx               elige pantalla: carga o dashboard
  Dashboard.jsx         layout del dashboard (se descarga aparte)
  vite-env.d.ts         tipos compartidos (Registro, Filtros)
  constants/            meses y colores de las gráficas
  lib/
    excel/              lectura segura del Excel (Web Worker, límites, zip-bomb)
    estadisticas.js     todos los cálculos (KPIs, agrupaciones, búsqueda)
    formato.js          números, horas y fechas en formato colombiano
  hooks/                useDashboard (filtros + cálculos), useNarrow
  components/
    ui/                 Section, KpiCard, MiniStat, YearSelector, ThemeToggle, ErrorBoundary, PiePagina
    charts/             Grafica, ChartTooltip, PeakLabel, chartTheme
    FileUploader.jsx    zona para subir el Excel
  sections/             cada bloque visual del dashboard
  styles/index.css      tokens de diseño (claro/oscuro) y estilos
  test/                 preparación y datos de las pruebas
scripts/                generador de la plantilla de ejemplo
```

Más detalle en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md). Seguridad en
[SECURITY.md](SECURITY.md). Cambios por versión en [CHANGELOG.md](CHANGELOG.md).

## Calidad

- **Pruebas:** cálculos, lector de Excel (incluidos archivos maliciosos),
  Web Worker y la interfaz completa con Testing Library. Cobertura mínima
  exigida: 90 % de líneas.
- **Tipos:** todo `src/` (lógica y props de cada componente) se revisa en
  modo estricto con TypeScript sobre JavaScript (JSDoc), sin migrar a `.ts`.
- **Accesibilidad:** auditoría automática con axe-core (WCAG 2.2 AA) en
  cada pantalla y estado, dentro de las pruebas.
- **CI:** cada push a `main` corre lint, tipos, pruebas con cobertura, build
  y auditoría de dependencias. Dependabot propone actualizaciones semanales.

## Accesibilidad

Auditado con **axe-core** (WCAG 2.2 AA + buenas prácticas) en un navegador
real, en modo claro y oscuro, en todos los estados (carga, error, dashboard,
filtros, sin resultados, tabla): **0 problemas**, contraste incluido. La
misma auditoría corre en cada CI (`src/a11y.test.jsx`).

Navegable con teclado (enlace "Saltar a los resultados" justo después del
título, zona de carga activable con Enter/Espacio, tabla con scroll
enfocable), estados anunciados a lectores de pantalla, resumen en texto de
cada gráfica, colores aptos para daltonismo, respeta "reducir movimiento".

## Tecnologías

React 19, Vite, Recharts, SheetJS (xlsx), Vitest, Testing Library, Oxlint y
TypeScript (solo para revisar tipos).
