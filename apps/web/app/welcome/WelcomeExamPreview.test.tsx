import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import WelcomeExamPreview from "./WelcomeExamPreview";

vi.mock("next/dynamic", () => ({ default: () => function Reader() { return <div tabIndex={0} aria-label="Páginas del documento de práctica">Interactive PDF reader</div>; } }));
vi.mock("next/image", () => ({ default: (props: React.ComponentProps<"img">) => <img {...props} /> }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function setup(mobile = false) {
  vi.stubGlobal("matchMedia", () => ({ matches: mobile, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  return render(<WelcomeExamPreview><button>Iniciar práctica</button></WelcomeExamPreview>);
}

describe("Welcome document preview", () => {
  it("loads the interactive reader on demand and preserves the welcome controls", () => {
    setup();
    expect(screen.queryByText("Interactive PDF reader")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abrir vista previa del documento de práctica" }));
    expect(screen.getByRole("region", { name: "Práctica de Matemáticas · 02-2026" })).toBeInTheDocument();
    expect(screen.getByText("Interactive PDF reader")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar práctica" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cerrar vista previa del documento" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Práctica de Matemáticas · 02-2026" })).not.toBeInTheDocument();
    // Keep the reader mounted across close/reopen to avoid loading flashes.
    const retainedReader = screen.getByText("Interactive PDF reader");
    fireEvent.click(screen.getByRole("button", { name: "Abrir vista previa del documento de práctica" }));
    expect(screen.getByText("Interactive PDF reader")).toBe(retainedReader);
  });

  it("opens a modal on small screens and contains keyboard focus", () => {
    setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Abrir vista previa del documento de práctica" }));
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Iniciar práctica", hidden: true }).parentElement).toHaveAttribute("inert");
    const close = screen.getByRole("button", { name: "Cerrar vista previa del documento" });
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(screen.getByLabelText("Páginas del documento de práctica")).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.click(close);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lets visitors pause and resume the backdrop", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Pausar animación del documento" }));
    expect(screen.getByRole("button", { name: "Reanudar animación del documento" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reanudar animación del documento" }));
    expect(screen.getByRole("button", { name: "Pausar animación del documento" })).toBeInTheDocument();
  });
});
