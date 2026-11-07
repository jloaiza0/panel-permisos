// Pie de página con la versión (viene de package.json, ver vite.config.js)
// y el recordatorio de privacidad.
export default function PiePagina() {
  return (
    <footer className="site-footer no-print">
      Panel de ausentismo v{__APP_VERSION__} · Los datos se procesan solo en este navegador
    </footer>
  );
}
