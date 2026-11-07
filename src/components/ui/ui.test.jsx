// @vitest-environment jsdom
// Pruebas de las piezas de interfaz reutilizables.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "./ErrorBoundary.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import KpiCard from "./KpiCard.jsx";
import ChartTooltip from "../charts/ChartTooltip.jsx";
import PeakLabel from "../charts/PeakLabel.jsx";

describe("ErrorBoundary", () => {
  it("muestra un mensaje en vez de una pantalla en blanco", () => {
    const Rompe = () => { throw new Error("falla"); };
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary><Rompe /></ErrorBoundary>);
    expect(screen.getByRole("heading", { name: "Algo salió mal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recargar página" })).toBeInTheDocument();
    silencio.mockRestore();
  });
});

describe("ThemeToggle", () => {
  it("cambia entre claro y oscuro y lo recuerda", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button", { name: "Cambiar a modo oscuro" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("panel-tema")).toBe("dark");

    await user.click(screen.getByRole("button", { name: "Cambiar a modo claro" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("panel-tema")).toBe("light");
  });

  it("con View Transitions anima el cambio con un círculo desde el botón", async () => {
    const animar = vi.fn();
    document.startViewTransition = (cambio) => { cambio(); return { ready: Promise.resolve() }; };
    document.documentElement.animate = animar;
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button", { name: "Cambiar a modo oscuro" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    await vi.waitFor(() => expect(animar).toHaveBeenCalled());
    expect(animar.mock.calls[0][1]).toMatchObject({ pseudoElement: "::view-transition-new(root)" });
    delete document.startViewTransition;
    delete document.documentElement.animate;
  });
});

describe("KpiCard", () => {
  it("marca subida, bajada o sin cambio con flecha y texto", () => {
    const { container, rerender } = render(<KpiCard label="Permisos" value="10" delta={{ pct: 12.5, anio: 2024 }} />);
    expect(container.querySelector(".kpi-delta")).toHaveAttribute("data-trend", "up");
    expect(screen.getByText(/\+12,5 %/)).toBeInTheDocument();

    rerender(<KpiCard label="Permisos" value="8" delta={{ pct: -20, anio: 2024 }} />);
    expect(container.querySelector(".kpi-delta")).toHaveAttribute("data-trend", "down");

    rerender(<KpiCard label="Permisos" value="8" delta={{ pct: 0, anio: 2024 }} />);
    expect(container.querySelector(".kpi-delta")).toHaveAttribute("data-trend", "flat");
  });
});

describe("Piezas de las gráficas", () => {
  it("el tooltip muestra el nombre y el valor con formato", () => {
    const { container, rerender } = render(<ChartTooltip active label="Ene" payload={[{ dataKey: "cantidad", name: "Permisos", value: 1946, color: "red" }]} />);
    expect(screen.getByText("Ene")).toBeInTheDocument();
    expect(screen.getByText("1.946")).toBeInTheDocument();
    rerender(<ChartTooltip active={false} payload={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("la etiqueta del pico solo aparece en la barra más alta", () => {
    const { container, rerender } = render(<svg><PeakLabel x={0} y={20} width={10} value={5} max={5} /></svg>);
    expect(container.querySelector("text")).toHaveTextContent("5");
    rerender(<svg><PeakLabel x={0} y={20} width={10} value={3} max={5} /></svg>);
    expect(container.querySelector("text")).toBeNull();
  });
});
