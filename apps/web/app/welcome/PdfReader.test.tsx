import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PdfReader from "./PdfReader";

const mocks = vi.hoisted(() => ({ getDocument: vi.fn(), destroy: vi.fn(), cancel: vi.fn() }));
vi.mock("pdfjs-dist", () => ({ getDocument: mocks.getDocument, GlobalWorkerOptions: {} }));

beforeEach(() => {
  const document = {
    numPages: 3,
    getPage: vi.fn().mockResolvedValue({
      getViewport: ({ scale }: { scale: number }) => ({ width: 612 * scale, height: 792 * scale }),
      render: () => ({ promise: Promise.resolve(), cancel: mocks.cancel }),
      getTextContent: () => Promise.resolve({ items: [{ str: "Contenido de la práctica" }] }),
    }),
  };
  mocks.getDocument.mockReturnValue({ promise: Promise.resolve(document), destroy: mocks.destroy });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  HTMLElement.prototype.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe("Practice PDF reader", () => {
  it("navigates pages, clamps direct input, and bounds zoom", async () => {
    render(<PdfReader />);
    await screen.findByRole("group", { name: "Controles del documento" });
    const input = screen.getByRole("textbox", { name: "Número de página" });
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(input).toHaveValue("2");
    fireEvent.change(input, { target: { value: "99" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue("3");
    expect(screen.getByRole("button", { name: "Página siguiente" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "invalid" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("3");
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole("button", { name: "Aumentar zoom" }));
    expect(screen.getByRole("button", { name: "Aumentar zoom" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ajustar página al ancho" })).toHaveTextContent("200%");
    fireEvent.click(screen.getByRole("button", { name: "Ajustar página al ancho" }));
    expect(screen.getByRole("button", { name: "Ajustar página al ancho" })).toHaveTextContent("100%");
  });

  it("releases the PDF worker and render tasks when closed", async () => {
    const { unmount } = render(<PdfReader />);
    await screen.findByText(/Contenido de la práctica/);
    unmount();
    expect(mocks.destroy).toHaveBeenCalledOnce();
    expect(mocks.cancel).toHaveBeenCalled();
  });

  it("offers recovery when the document fails to load", async () => {
    mocks.getDocument.mockReturnValueOnce({ promise: Promise.reject(new Error("offline")), destroy: mocks.destroy });
    render(<PdfReader />);
    await screen.findByRole("alert");
    expect(screen.getByRole("link", { name: "Abrir PDF original ↗" })).toHaveAttribute("href", "/documents/Practica-BxM-Matematicas-02-2026.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.getByRole("group", { name: "Controles del documento" })).toBeInTheDocument());
  });
});
