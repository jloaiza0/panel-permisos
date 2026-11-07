/**
 * La tarjeta que envuelve cada bloque del dashboard, con título y subtítulo.
 *
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   children?: import("react").ReactNode,
 *   className?: string,
 *   style?: import("react").CSSProperties,
 * }} props
 */
export default function Section({ title, subtitle, children, className = "", style }) {
  return (
    <section className={`card section ${className}`} style={style}>
      <div className="section-head">
        <div>
          <h2 className="card-title">{title}</h2>
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
