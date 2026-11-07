// Estilo con el orden de entrada de la animación "reveal" (ver .reveal en
// styles/index.css): cada bloque aparece 50 ms después del anterior.
// React no conoce la variable CSS "--i", por eso se le indica el tipo.
/**
 * @param {number} i posición del bloque (0 = el primero)
 * @returns {import("react").CSSProperties}
 */
export const orden = (i) => /** @type {import("react").CSSProperties} */ ({ "--i": i });
