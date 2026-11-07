import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// Agrega una Content-Security-Policy al index.html del build. GitHub Pages
// no deja configurar cabeceras, así que va como <meta>. Le dice al navegador
// que solo ejecute scripts de este mismo sitio (más el script del tema,
// permitido por su hash), y que no se conecte a ningún otro servidor.
// Solo aplica al build: el servidor de desarrollo inyecta scripts propios.
function cspPlugin() {
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          // El navegador convierte los saltos de línea de Windows (\r\n) a \n
          // antes de calcular el hash, así que hacemos lo mismo.
          ([, code]) => `'sha256-${createHash('sha256').update(code.replace(/\r\n?/g, '\n')).digest('base64')}'`
        )
        const csp = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(' ')}`,
          // Sin 'unsafe-inline': React y las gráficas aplican estilos desde
          // JavaScript (style.propiedad = ...), y eso la CSP sí lo permite.
          "style-src 'self'",
          "worker-src 'self'",
          "img-src 'self' data:",
          "font-src 'self'",
          "connect-src 'self'",
          "media-src 'none'",
          "frame-src 'none'",
          "manifest-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'none'",
          // Trusted Types: el navegador bloquea cualquier intento de meter
          // código como texto (innerHTML, eval, scripts) salvo por la única
          // "política" declarada aquí, que solo crea el Web Worker del Excel
          // (ver lib/excel/procesarExcel.js). Corta de raíz los ataques XSS.
          "require-trusted-types-for 'script'",
          "trusted-types excel-worker",
        ].join('; ')
        return html.replace(
          '<head>',
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />` +
            // No enviar la dirección de esta página a otros sitios.
            `\n    <meta name="referrer" content="no-referrer" />`
        )
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cspPlugin()],
  base: '/panel-permisos/', // cámbialo por el nombre exacto de tu repo
  // Versión de package.json, visible en el pie de página.
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: {
    // El lector de Excel (SheetJS) pesa ~490 KB y se carga solo al subir un
    // archivo, dentro de un Web Worker: no afecta la carga de la página.
    chunkSizeWarningLimit: 520,
  },
  test: {
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/test/**', 'src/main.jsx', 'src/lib/excel/excel.worker.js'],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 90, functions: 85, branches: 80, statements: 90 },
    },
  },
})
