// La tarjeta que envuelve cada bloque del dashboard, con título y subtítulo.
export default function Section({ title, subtitle, children, className = "", style, actions }) {
  return (
    <section className={`card section ${className}`} style={style}>
      <div className="section-head">
        <div>
          <h2 className="card-title">{title}</h2>
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
