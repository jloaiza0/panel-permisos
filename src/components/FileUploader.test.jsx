// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FileUploader from "./FileUploader.jsx";

// jsdom no tiene DragEvent: un MouseEvent "dragleave" sí lleva relatedTarget.
const salir = (haciaDonde) => new MouseEvent("dragleave", { bubbles: true, relatedTarget: haciaDonde });
const zona = () => screen.getByRole("button", { name: "Seleccionar archivo Excel de permisos" });

describe("FileUploader", () => {
  it("se pinta al arrastrar encima y no parpadea al pasar sobre su contenido", () => {
    render(<FileUploader onDatosCargados={() => {}} />);
    fireEvent.dragOver(zona());
    expect(zona()).toHaveAttribute("data-dragging", "true");

    // Pasar sobre el ícono o el texto de adentro no cuenta como "salir".
    fireEvent(zona(), salir(zona().querySelector("p")));
    expect(zona()).toHaveAttribute("data-dragging", "true");

    fireEvent(zona(), salir(document.body));
    expect(zona()).toHaveAttribute("data-dragging", "false");
  });

  it("rechaza archivos de más de 10 MB sin leerlos", () => {
    const onDatos = vi.fn();
    render(<FileUploader onDatosCargados={onDatos} />);
    const grande = new File([new Uint8Array(11 * 1024 * 1024)], "grande.xlsx");
    fireEvent.drop(zona(), { dataTransfer: { files: [grande] } });
    expect(screen.getByRole("alert")).toHaveTextContent("máximo 10MB");
    expect(onDatos).not.toHaveBeenCalled();
  });

  it("al soltar sin archivo no hace nada", () => {
    render(<FileUploader onDatosCargados={() => {}} />);
    fireEvent.drop(zona(), { dataTransfer: { files: [] } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
