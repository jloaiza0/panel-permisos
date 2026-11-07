import { ResponsiveContainer } from "recharts";

// Envoltorio de cada gráfica: título opcional, tamaño adaptable y un
// resumen en texto que solo leen los lectores de pantalla (una gráfica SVG
// por sí sola no le dice nada a quien no ve la pantalla).
export default function Grafica({ titulo, descripcion, height, children }) {
  return (
    <figure className="grafica">
      {titulo && <figcaption className="sub-title">{titulo}</figcaption>}
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
      {descripcion && <p className="sr-only">{descripcion}</p>}
    </figure>
  );
}
