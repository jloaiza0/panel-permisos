# Seguridad

## Modelo

El panel es una página estática (GitHub Pages). El Excel se lee **solo en
el navegador** de quien lo abre: no hay servidor, base de datos ni envío de
datos a terceros. Lo único que se guarda es la preferencia de tema claro u
oscuro (`localStorage`).

## Protecciones

| Riesgo | Protección | Dónde |
|---|---|---|
| Código inyectado (XSS) | CSP estricta: solo scripts propios, sin `unsafe-inline` ni `eval` | `vite.config.js` |
| XSS por `innerHTML` y similares | **Trusted Types** obligatorio; la única política permitida crea el Web Worker y solo acepta su propia dirección | `vite.config.js`, `lib/excel/procesarExcel.js` |
| Fuga de datos a otros sitios | `connect-src 'self'`, `form-action 'none'`, `referrer: no-referrer`, fuentes alojadas en el proyecto | `vite.config.js`, `main.jsx` |
| Clickjacking (la página dentro de un marco ajeno) | Detección en JavaScript: sale del marco o no dibuja el panel | `main.jsx` |
| Texto malicioso en el Excel | React muestra todo como texto plano; los nombres raros (`__proto__`) se cuentan con `Map` | `lib/estadisticas.js` |
| Archivo que congela la pestaña | Límite de 10 MB, 100.000 filas y 50 columnas; lectura en Web Worker con 30 s de tiempo máximo | `FileUploader.jsx`, `lib/excel/` |
| Zip-bomb (archivo que se infla al descomprimir) | Se revisa el índice del zip **antes** de abrirlo (máximo 300 MB) | `lib/excel/parseExcel.js` |
| Dependencias vulnerables | `npm audit` en cada CI y Dependabot semanal | `.github/` |

Las protecciones de archivos maliciosos tienen pruebas automáticas en
`src/lib/excel/parseExcel.test.js` y `procesarExcel.test.js`.

## Límites conocidos

- GitHub Pages no permite enviar cabeceras HTTP, así que la CSP va como
  `<meta>` y no puede incluir `frame-ancestors`; por eso el bloqueo de
  marcos se hace con JavaScript.

## Reportar un problema

Abre un issue en el repositorio **sin** adjuntar archivos con datos reales
del personal.
