import { createHash } from 'node:crypto'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
          "style-src 'self' 'unsafe-inline'", // las gráficas usan estilos inline
          "img-src 'self' data:",
          "font-src 'self'",
          "connect-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'none'",
        ].join('; ')
        return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cspPlugin()],
  base: '/panel-permisos/', // cámbialo por el nombre exacto de tu repo
})
