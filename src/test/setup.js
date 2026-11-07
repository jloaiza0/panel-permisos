// Preparación común de las pruebas. Las pruebas de interfaz corren en
// "jsdom" (un navegador simulado); aquí se agregan las piezas del navegador
// que jsdom no trae.
import { afterEach, expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

if (typeof window !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => {
    cleanup();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  window.matchMedia ??= (query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });

  // Las gráficas y el selector de año miden su tamaño con ResizeObserver.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // jsdom no implementa la Web Animations API (sacudida de la zona de carga).
  Element.prototype.animate ??= function () {
    return { finished: Promise.resolve(), cancel() {} };
  };
}
