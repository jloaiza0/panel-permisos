// ============================================================================
// ErrorBoundary.jsx
// ----------------------------------------------------------------------------
// ¿PARA QUÉ SIRVE ESTE ARCHIVO?
//
// Si React encuentra un error inesperado mientras dibuja la pantalla (por
// ejemplo, un dato del Excel que rompe un cálculo), por defecto TODA la
// página se queda en blanco, sin ningún mensaje. El usuario no sabe qué pasó.
//
// Este archivo es una "red de seguridad" (en inglés: "error boundary" =
// "frontera de error"). Atrapa esos errores y, en vez de dejar la pantalla
// en blanco, muestra un mensaje amigable con un botón para recargar.
//
// Se usa envolviendo el resto de la app con él, en main.jsx:
//
//     <ErrorBoundary>
//       <App />
//     </ErrorBoundary>
//
// Mientras nada falle, es invisible: no notas que existe. Si algo se rompe
// dentro de <App />, aparece con el mensaje de emergencia.
// ============================================================================

import { Component } from "react";

// React tiene dos formas de escribir componentes: FUNCIONES (como el resto
// de tu app: App.jsx, FileUploader.jsx) y CLASES. Este es el único archivo
// de tu proyecto que usa una clase, porque la funcionalidad de "atrapar
// errores" solo existe en componentes de clase — React no ofrece (todavía)
// una forma de hacerlo con funciones.
export default class ErrorBoundary extends Component {

  // El CONSTRUCTOR es lo primero que se ejecuta al crear el componente.
  // Aquí se inicializa una "memoria" (this.state) con una bandera:
  //   conError: false  →  significa "por ahora todo bien, no ha pasado
  //                        ningún error".
  constructor(props) {
    super(props); // obligatorio: le pasa las props al componente padre (Component)
    this.state = { conError: false };
  }

  // MÉTODO MÁGICO Nº1 (React lo llama automáticamente, tú nunca lo invocas).
  //
  // Si CUALQUIER componente hijo (o sea, tu <App /> completo, ya que lo
  // envolvemos con este ErrorBoundary) lanza un error mientras se dibuja,
  // React ejecuta este método por sí solo.
  //
  // Aquí simplemente le decimos: "cambia la bandera a true", es decir,
  // "sí hubo un error".
  static getDerivedStateFromError() {
    return { conError: true };
  }

  // MÉTODO MÁGICO Nº2 (también automático).
  //
  // Se dispara justo después del anterior. Sirve para REGISTRAR el error,
  // no para decidir qué se muestra en pantalla (eso ya lo hizo el método
  // de arriba). Aquí lo mandamos a la consola del navegador (F12 → Console)
  // para que tú, como desarrollador, puedas ver exactamente qué pasó si
  // alguien te reporta un problema.
  componentDidCatch(error, info) {
    console.error("Error en la aplicación:", error, info);
  }

  // RENDER: decide qué se dibuja en pantalla en cada momento.
  render() {

    // CASO 1: hubo un error (conError === true)
    // → Mostramos la pantalla de emergencia en vez del dashboard normal.
    if (this.state.conError) {
      return (
        <div
          style={{
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            background: "#F6F4EF",
            minHeight: "100vh",      // ocupa como mínimo toda la altura de la pantalla
            display: "flex",
            alignItems: "center",    // centra verticalmente
            justifyContent: "center",// centra horizontalmente
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 420, textAlign: "center" }}>

            <h1
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 22,
                color: "#1E2A38",
                marginBottom: 8,
              }}
            >
              Algo salió mal
            </h1>

            <p style={{ color: "#6B6858", fontSize: 14, marginBottom: 20 }}>
              Ocurrió un error inesperado al procesar los datos. Verifica que
              el Excel tenga el formato correcto e intenta de nuevo.
            </p>

            {/* Botón de "salvavidas": recarga la página desde cero,
                lo que borra el error y vuelve a la pantalla inicial
                de subir el Excel. */}
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 20px",
                borderRadius: 6,
                border: "1px solid #0F6E56",
                background: "#0F6E56",
                color: "#FFFFFF",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    // CASO 2: NO hubo ningún error (conError === false) → caso normal.
    //
    // this.props.children significa literalmente "lo que sea que este
    // componente esté envolviendo". Como en main.jsx escribimos:
    //
    //     <ErrorBoundary>
    //       <App />          <-- esto es "children"
    //     </ErrorBoundary>
    //
    // this.props.children ES tu <App /> completo. O sea: si todo va bien,
    // el ErrorBoundary es "transparente" y simplemente deja pasar tu
    // aplicación normal, sin cambiar nada.
    return this.props.children;
  }
}