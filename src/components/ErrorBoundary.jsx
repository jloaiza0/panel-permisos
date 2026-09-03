import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { conError: false };
  }

  static getDerivedStateFromError() {
    return { conError: true };
  }

  componentDidCatch(error, info) {
    console.error("Error en la aplicación:", error, info);
  }

  render() {
    if (this.state.conError) {
      return (
        <div style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", background: "#F6F4EF", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "#1E2A38", marginBottom: 8 }}>
              Algo salió mal
            </h1>
            <p style={{ color: "#6B6858", fontSize: 14, marginBottom: 20 }}>
              Ocurrió un error inesperado al procesar los datos. Verifica que el Excel tenga el formato correcto e intenta de nuevo.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: "10px 20px", borderRadius: 6, border: "1px solid #0F6E56", background: "#0F6E56", color: "#FFFFFF", fontSize: 14, cursor: "pointer" }}
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}