// ============================================================================
// ThemeToggle.jsx
// ----------------------------------------------------------------------------
// ¿PARA QUÉ SIRVE ESTE ARCHIVO?
//
// Es el botón de sol/luna de arriba a la derecha que cambia entre modo
// claro y modo oscuro. Hace tres cosas:
//
//   1. Cambia el atributo data-theme de <html>. Todo el CSS (index.css) y
//      las gráficas leen sus colores de variables que dependen de ese
//      atributo, así que la app entera cambia de una vez.
//   2. Recuerda la elección en este navegador (localStorage), para que al
//      volver a abrir el panel siga en el modo que dejaste. index.html la
//      lee ANTES de que cargue React, así no hay un "parpadeo" blanco.
//   3. Anima el cambio: el ícono se transforma de sol a luna (ver
//      ".theme-toggle" en index.css) y el tema nuevo se revela con un
//      círculo que crece desde el botón.
// ============================================================================

import { useId, useState } from "react";
import { flushSync } from "react-dom";

const CLAVE = "panel-tema"; // nombre con el que se guarda en el navegador
const COLOR_BARRA = { light: "#F6F4EF", dark: "#14171B" }; // color de la barra del navegador en celulares

export default function ThemeToggle() {
  // El tema inicial lo decidió index.html (antes de React) y lo dejó
  // escrito en <html data-theme="...">: aquí solo lo leemos.
  const [tema, setTema] = useState(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light"
  );
  const maskId = useId(); // id único para la máscara del SVG

  /** @param {import("react").MouseEvent<HTMLButtonElement>} e */
  function cambiarTema(e) {
    const siguiente = tema === "dark" ? "light" : "dark";

    // Lo que realmente cambia el tema (se usa con o sin animación).
    const aplicar = () => {
      document.documentElement.dataset.theme = siguiente;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COLOR_BARRA[siguiente]);
      // flushSync: obliga a React a actualizar el botón YA, dentro de la
      // "foto" de la transición, y no un instante después.
      flushSync(() => setTema(siguiente));
      try { localStorage.setItem(CLAVE, siguiente); } catch { /* modo privado: no pasa nada */ }
    };

    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Navegadores sin "View Transitions" (o con movimiento reducido):
    // cambio instantáneo. El ícono igual se transforma con su transición CSS.
    if (!document.startViewTransition || reducir) {
      aplicar();
      return;
    }

    // Centro del botón = centro del círculo. El radio final es la
    // distancia hasta la esquina más lejana de la pantalla, para que el
    // círculo la cubra entera.
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    const transicion = document.startViewTransition(aplicar);
    transicion.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
        {
          duration: 550,
          easing: "cubic-bezier(0.23, 1, 0.32, 1)", // ease-out fuerte (Emil Kowalski)
          pseudoElement: "::view-transition-new(root)",
        }
      );
    }).catch(() => { /* si la transición se cancela, el tema ya quedó aplicado */ });
  }

  const etiqueta = tema === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <button type="button" className="theme-toggle" onClick={cambiarTema} aria-label={etiqueta} title={etiqueta}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        {/* Máscara: todo visible (blanco) menos el círculo negro, que es
            la "mordida" que convierte el círculo en media luna. En modo
            claro la mordida está fuera del ícono, así que no se nota. */}
        <mask id={maskId}>
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <circle className="tt-bite" cx="17" cy="7" r="7" fill="black" />
        </mask>
        {/* Centro del sol / cuerpo de la luna */}
        <circle className="tt-core" cx="12" cy="12" r="9" fill="currentColor" mask={`url(#${maskId})`} />
        {/* 8 rayos del sol */}
        <g className="tt-rays" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((g) => {
            const rad = (g * Math.PI) / 180;
            return (
              <line
                key={g}
                x1={12 + Math.cos(rad) * 8}
                y1={12 + Math.sin(rad) * 8}
                x2={12 + Math.cos(rad) * 10.5}
                y2={12 + Math.sin(rad) * 10.5}
              />
            );
          })}
        </g>
      </svg>
    </button>
  );
}
