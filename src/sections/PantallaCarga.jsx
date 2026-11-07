import { useEffect } from "react";
import { Download, ShieldCheck } from "lucide-react";
import FileUploader from "../components/FileUploader.jsx";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";
import PiePagina from "../components/ui/PiePagina.jsx";

// Columnas que debe tener el Excel (se buscan por nombre, en cualquier orden).
const COLUMNAS = [
  { nombre: "Fecha", nota: "obligatoria" },
  { nombre: "Nombre", nota: "obligatoria" },
  { nombre: "Concepto", nota: "obligatoria" },
  { nombre: "Tiempo", nota: "opcional" },
];

// Pantalla inicial: título, zona para subir el Excel y ayuda sobre el
// formato. "precargar" baja en segundo plano el código del dashboard
// mientras el usuario elige el archivo, así aparece sin espera.
/**
 * @param {{
 *   onDatosCargados: (registros: Registro[], nombreArchivo: string) => void,
 *   precargar?: () => unknown,
 * }} props
 */
export default function PantallaCarga({ onDatosCargados, precargar }) {
  useEffect(() => { precargar?.(); }, [precargar]);

  return (
    <div className="page page-upload">
      <div className="corner-toggle no-print"><ThemeToggle /></div>
      <main className="upload-panel reveal">
        <h1 className="page-title upload-title">Panel de ausentismo</h1>
        <p className="upload-lead">Selecciona el Excel de permisos para comenzar</p>

        <FileUploader onDatosCargados={onDatosCargados} />

        <p className="upload-note">
          <ShieldCheck size={14} aria-hidden="true" />
          El archivo se procesa en tu navegador: no se envía a ningún servidor.
        </p>

        <section className="format-help" aria-labelledby="formato-titulo">
          <h2 id="formato-titulo" className="format-title">Formato esperado</h2>
          <ul className="format-list">
            {COLUMNAS.map((c) => (
              <li key={c.nombre}>
                <span className="format-col">{c.nombre}</span>
                <span className="format-note">{c.nota}</span>
              </li>
            ))}
          </ul>
          <a className="btn format-download" href={`${import.meta.env.BASE_URL}plantilla-permisos.xlsx`} download>
            <Download size={14} aria-hidden="true" /> Descargar plantilla de ejemplo
          </a>
        </section>
      </main>
      <PiePagina />
    </div>
  );
}
