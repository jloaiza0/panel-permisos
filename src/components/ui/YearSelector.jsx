import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Selector de año con indicador deslizante. Hay DOS copias de los botones,
// una encima de la otra:
//   - Abajo: los botones reales (texto oscuro, se pueden pulsar).
//   - Arriba: una copia "activa" (fondo verde, texto blanco) recortada con
//     clip-path para que solo se vea el botón elegido.
// Al cambiar de año se anima el recorte: el verde se desliza y el color del
// texto cambia justo en el borde del verde.
/**
 * @param {{
 *   opciones: Array<string | number>,
 *   valor: string | number,
 *   onCambio: (valor: any) => void,
 * }} props
 */
export default function YearSelector({ opciones, valor, onCambio }) {
  const cajaRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const botonesRef = useRef(/** @type {Record<string, HTMLButtonElement | null>} */ ({}));
  const [recorte, setRecorte] = useState(/** @type {string | null} */ (null));
  const [animar, setAnimar] = useState(false); // false = todavía no se ha medido

  // Mide el botón activo y calcula el recorte. Se repite al cambiar el año
  // o el tamaño de la caja (por ejemplo, al girar el celular).
  // (La lista de años no cambia mientras el selector existe: al cargar
  // otro Excel, el dashboard entero se vuelve a crear.)
  useLayoutEffect(() => {
    const caja = cajaRef.current;
    if (!caja) return;
    const medir = () => {
      const b = botonesRef.current[valor];
      if (!b) return;
      const izq = b.offsetLeft;
      const der = caja.clientWidth - (b.offsetLeft + b.offsetWidth);
      setRecorte(`inset(0 ${der}px 0 ${izq}px round 6px)`);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(caja);
    return () => ro.disconnect();
  }, [valor]);

  // La primera vez el indicador aparece directo en su lugar, sin deslizarse.
  useEffect(() => {
    if (!recorte || animar) return;
    const id = requestAnimationFrame(() => setAnimar(true));
    return () => cancelAnimationFrame(id);
  }, [recorte, animar]);

  return (
    <div ref={cajaRef} className="seg" role="group" aria-label="Filtrar por año">
      {opciones.map((o) => (
        <button
          key={o}
          ref={(el) => { botonesRef.current[o] = el; }}
          type="button"
          className="seg-btn num"
          aria-pressed={valor === o}
          onClick={() => onCambio(o)}
        >
          {o}
        </button>
      ))}
      <div
        className="seg-overlay"
        aria-hidden="true"
        style={{ clipPath: recorte ?? "inset(0 100% 0 0)", transition: animar ? undefined : "none" }}
      >
        {opciones.map((o) => <span key={o} className="seg-btn num">{o}</span>)}
      </div>
    </div>
  );
}
