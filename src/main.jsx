// ============================================================================
// main.jsx
// ----------------------------------------------------------------------------
// ¿PARA QUÉ SIRVE ESTE ARCHIVO?
//
// Es el PUNTO DE ARRANQUE de toda la aplicación — el primer archivo de tu
// código que se ejecuta cuando alguien abre la página. Su único trabajo es:
//   "Toma mi componente App, y móntalo dentro del <div id="root"></div>
//    que hay en index.html".
//
// Es muy corto a propósito: no tiene lógica de negocio, ni gráficas, ni
// estados — solo la conexión entre el HTML puro (index.html) y el mundo
// de React (App.jsx). Casi nunca vas a necesitar tocar este archivo salvo
// que agregues algo que deba envolver TODA la app (como hicimos con
// ErrorBoundary).
// ============================================================================

// StrictMode: una herramienta de React que NO afecta lo que ve el
// usuario final, pero durante el desarrollo (npm run dev) ayuda a
// detectar errores comunes ejecutando ciertas partes del código dos
// veces a propósito, para que si algo depende de "efectos secundarios"
// mal manejados, se note rápido. En producción (npm run deploy) esto no
// tiene ningún impacto en velocidad ni comportamiento.
import { StrictMode } from 'react'

// createRoot: la función de React que "engancha" tu aplicación a un
// elemento real del HTML. Es la puerta de entrada entre el mundo normal
// de HTML/CSS y el mundo de componentes de React.
import { createRoot } from 'react-dom/client'

// Importa los estilos globales (ver la documentación de index.css). Aunque
// este archivo no "usa" directamente ninguna clase de ahí, esta línea es
// necesaria para que Vite sepa que debe incluir ese CSS en la página final.
// Fuentes alojadas DENTRO del proyecto (no se piden a Google ni a ningún
// servidor externo): Public Sans para la interfaz y los números, y
// Newsreader (con tamaño óptico) para los títulos.
import '@fontsource-variable/public-sans'
import '@fontsource-variable/newsreader/opsz.css'

import './index.css'

// Tu componente principal, con todo el dashboard.
import App from './App.jsx'

// El componente que atrapa errores inesperados y muestra un mensaje
// amigable en vez de pantalla en blanco (ver su documentación aparte).
import ErrorBoundary from './components/ErrorBoundary.jsx'


// Esta es la única instrucción "de verdad" de todo el archivo:
//
// 1. document.getElementById('root')
//    Busca en el HTML el elemento <div id="root"></div> (lo puedes ver
//    en index.html). Ese div está vacío al principio — es solo un
//    "contenedor" esperando a que algo lo llene.
//
// 2. createRoot(...)
//    Le dice a React: "a partir de ahora, TÚ vas a controlar todo lo que
//    pase dentro de ese div".
//
// 3. .render(...)
//    Dibuja, por primera vez, el árbol de componentes que le pasamos:
//
//       <StrictMode>              ← modo de ayuda para desarrollo (ver arriba)
//         <ErrorBoundary>         ← red de seguridad ante errores
//           <App />               ← tu dashboard completo
//         </ErrorBoundary>
//       </StrictMode>
//
//    El orden de "quién envuelve a quién" importa: como <App /> está
//    DENTRO de <ErrorBoundary>, si algo se rompe en cualquier parte de
//    App (o de cualquier componente que ella use), el ErrorBoundary lo
//    atrapa. Si <ErrorBoundary> no envolviera a <App />, un error ahí
//    dejaría la pantalla en blanco sin ningún control.
//
// Protección contra "clickjacking": otro sitio podría mostrar este panel
// dentro de un marco invisible y engañar al usuario para que haga clic en
// él. GitHub Pages no deja enviar la cabecera que lo prohíbe, así que lo
// revisamos aquí: si estamos dentro de un marco, intentamos salir de él y,
// si no se puede, no dibujamos el panel. (Solo en producción, para no
// estorbar en herramientas de desarrollo que usan marcos.)
const dentroDeMarco = window.top !== window.self

if (dentroDeMarco && import.meta.env.PROD) {
  try { window.top.location = window.location.href } catch { /* el marco no lo permite */ }
  document.getElementById('root').textContent =
    'Por seguridad, este panel solo se puede abrir directamente en su propia pestaña.'
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}