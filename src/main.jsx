// ============================================================================
// main.jsx
// ----------------------------------------------------------------------------
// Punto de arranque: monta <App /> dentro del <div id="root"> de index.html,
// envuelto en ErrorBoundary (si algo falla, se muestra un mensaje en vez de
// una pantalla en blanco).
// ============================================================================
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Fuentes alojadas DENTRO del proyecto (no se piden a ningún servidor
// externo): Public Sans para la interfaz y Newsreader para los títulos.
import "@fontsource-variable/public-sans";
import "@fontsource-variable/newsreader/opsz.css";
import "./styles/index.css";

import App from "./App.jsx";
import ErrorBoundary from "./components/ui/ErrorBoundary.jsx";

const root = document.getElementById("root");

// Protección contra "clickjacking": otro sitio podría mostrar este panel
// dentro de un marco invisible y engañar al usuario para que haga clic.
// GitHub Pages no deja enviar la cabecera que lo prohíbe, así que se revisa
// aquí: dentro de un marco, se intenta salir y, si no se puede, no se
// dibuja el panel. (Solo en producción: las herramientas de desarrollo usan
// marcos.)
if (window.top !== window.self && import.meta.env.PROD) {
  try { window.top.location = window.location.href; } catch { /* el marco no lo permite */ }
  root.textContent = "Por seguridad, este panel solo se puede abrir directamente en su propia pestaña.";
} else {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}
