import { useEffect, useState } from "react";

// ¿La pantalla es angosta (celular)? Escucha los cambios de tamaño, por
// ejemplo al girar el celular.
export function useNarrow(maxWidth = 520) {
  const query = `(max-width: ${maxWidth}px)`;
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return narrow;
}
