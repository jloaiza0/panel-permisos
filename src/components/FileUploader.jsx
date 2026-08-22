import { useRef, useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { parseExcel } from "../lib/parseExcel";

export default function FileUploader({ onDatosCargados }) {
  const inputRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  async function procesarArchivo(file) {
    if (!file) return;
    const esExcel = /\.(xlsx|xls)$/i.test(file.name);
    if (!esExcel) {
      setError("El archivo debe ser .xlsx o .xls");
      return;
    }
    setError(null);
    setCargando(true);
    try {
      const registros = await parseExcel(file);
      onDatosCargados(registros, file.name);
    } catch (e) {
      setError(e.message || "No se pudo leer el archivo. Verifica que sea el formato correcto.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastrando(false);
        procesarArchivo(e.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${arrastrando ? "#0F6E56" : "#DAD6C8"}`,
        borderRadius: 12,
        padding: "48px 24px",
        textAlign: "center",
        cursor: "pointer",
        background: arrastrando ? "#EAF3F0" : "#FFFFFF",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={(e) => procesarArchivo(e.target.files?.[0])}
      />

      {cargando ? (
        <p style={{ color: "#6B6858", fontSize: 14 }}>Procesando archivo…</p>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "#0F6E56" }}>
            {arrastrando ? <FileSpreadsheet size={32} /> : <Upload size={32} />}
          </div>
          <p style={{ fontWeight: 600, color: "#1E2A38", marginBottom: 4 }}>
            Selecciona o arrastra tu Excel de permisos
          </p>
          <p style={{ fontSize: 13, color: "#6B6858", margin: 0 }}>
            Formatos aceptados: .xlsx, .xls — el archivo no sale de tu dispositivo
          </p>
        </>
      )}

      {error && (
        <p style={{ color: "#D85A30", fontSize: 13, marginTop: 12 }}>{error}</p>
      )}
    </div>
  );
}