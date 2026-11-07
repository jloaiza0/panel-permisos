# Cambios

## 1.2.1 — 2026-11-07

### Correcciones
- El enlace "Saltar a los resultados" asomaba sobre el título aunque no tuviera
  el foco. Ahora queda invisible hasta que se llega a él con Tab.

## 1.2.0 — 2026-11-07

### Accesibilidad
- Auditoría con axe-core (WCAG 2.2 AA) en navegador real, claro y oscuro, en
  todos los estados: 0 problemas. Se corrigieron los dos que encontró:
  - La zona de carga anunciaba un nombre distinto al texto visible (afectaba
    el control por voz).
  - La tabla de búsqueda tenía scroll pero no se podía enfocar con el teclado.
- El enlace "Saltar a los resultados" ahora es lo primero que se alcanza con
  Tab después del título.
- Nueva prueba automática de accesibilidad (`src/a11y.test.jsx`) en el CI.

### Calidad
- La revisión de tipos estricta cubre ahora todo `src/`: props de cada
  componente y lo que se pasa a las gráficas de Recharts.

## 1.1.0 — 2026-11-07

### Nuevo
- Plantilla de Excel de ejemplo descargable y ayuda de formato en la pantalla de carga.
- Línea "Mostrando X de Y permisos" y botón **Limpiar filtros**.
- Pie de página con la versión.
- Enlace "Saltar a los resultados" y foco automático en el título al cargar.
- Trusted Types en la política de seguridad y `referrer: no-referrer`.

### Calidad
- Pruebas de interfaz (Testing Library), del Web Worker y de la zona de carga:
  de 26 a 60 pruebas, con cobertura mínima del 90 %.
- Revisión de tipos estricta de la lógica con TypeScript sobre JSDoc.
- CI con tipos, cobertura y auditoría de dependencias; Dependabot semanal.
- `.editorconfig`, `.gitattributes` (saltos de línea LF) y `.nvmrc`.
- La búsqueda guarda los nombres ya normalizados (más rápida con muchos registros).

## 1.0.0 — 2026-11-07

### Cambios
- Proyecto reorganizado por capas (`sections/`, `components/`, `hooks/`, `lib/`, `constants/`).
- El dashboard se descarga aparte: el JavaScript inicial bajó de 617 KB a 206 KB.
- Búsqueda sin tildes ni mayúsculas; fechas como "14 Mar 2025".
- Resumen en texto de cada gráfica para lectores de pantalla.
- El PDF muestra los filtros aplicados; el tema sigue al sistema la primera vez.

### Correcciones
- La tabla de búsqueda podía congelar la página (ahora máximo 200 filas).
- El comparador con el mismo año en A y B duplicaba la línea.
- La zona de carga parpadeaba al arrastrar el archivo.
