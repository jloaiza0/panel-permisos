import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import FileUploader from "../components/FileUploader.jsx";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";

// Pantalla inicial: título y zona para subir el Excel. "precargar" baja en
// segundo plano el código del dashboard mientras el usuario elige el
// archivo, así al terminar de leerlo aparece sin espera.
export default function PantallaCarga({ onDatosCargados, precargar }) {
  useEffect(() => { precargar?.(); }, [precargar]);

  return (
    <main className="page page-center">
      <div className="corner-toggle no-print"><ThemeToggle /></div>
      <div className="upload-panel reveal">
        <h1 className="page-title upload-title">Panel de ausentismo</h1>
        <p className="upload-lead">Selecciona el Excel de permisos para comenzar</p>
        <FileUploader onDatosCargados={onDatosCargados} />
        <p className="upload-note">
          <ShieldCheck size={14} aria-hidden="true" />
          El archivo se procesa en tu navegador: no se envía a ningún servidor.
        </p>
      </div>
    </main>
  );
}
