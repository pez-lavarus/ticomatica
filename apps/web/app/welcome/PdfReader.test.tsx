import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PdfReader from "./PdfReader";

const mocks = vi.hoisted(() => ({ getDocument: vi.fn(), destroy: vi.fn(), cancel: vi.fn(), render: vi.fn() }));
vi.mock("pdfjs-dist", () => ({ getDocument: mocks.getDocument, GlobalWorkerOptions: {} }));

beforeEach(() => {
  mocks.render.mockReturnValue({ promise: Promise.resolve(), cancel: mocks.cancel });
  const document = {
    numPages: 12,
    getPage: vi.fn().mockResolvedValue({
      getViewport: ({ scale }: { scale: number }) => ({ width: 612 * scale, height: 792 * scale }),
      render: mocks.render,
      getTextContent: () => Promise.resolve({ items: [{ str: "Contenido de la práctica" }] }),
    }),
  };
  mocks.getDocument.mockReturnValue({ promise: Promise.resolve(document), destroy: mocks.destroy });
  vi.stubGlobal("ResizeObserver", class {
    constructor(private callback: ResizeObserverCallback) {}
    observe() { this.callback([{ contentRect: { width: 640 } } as ResizeObserverEntry], this as unknown as ResizeObserver); }
    disconnect() {}
  });
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  HTMLElement.prototype.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe("Practice PDF reader", () => {
  it("renders the document in a keyboard-scrollable area without a toolbar", async () => {
    render(<PdfReader />);
    const pages = await screen.findByLabelText("Páginas del documento de práctica");
    expect(pages).toHaveAttribute("tabindex", "0");
    expect(pages.querySelectorAll("[data-pdf-page]")).toHaveLength(5);
    expect(screen.queryByRole("group", { name: "Controles del documento" })).not.toBeInTheDocument();
    await screen.findByText(/Contenido de la práctica/);
  });

  it("appends five pages at a time without replacing existing pages", async () => {
    render(<PdfReader />);
    const pages = await screen.findByLabelText("Páginas del documento de práctica");
    const first = pages.querySelector('[data-pdf-page="1"]');
    fireEvent.click(screen.getByRole("button", { name: "Ver más" }));
    expect(pages.querySelectorAll("[data-pdf-page]")).toHaveLength(10);
    expect(pages.querySelector('[data-pdf-page="1"]')).toBe(first);
    fireEvent.click(screen.getByRole("button", { name: "Ver más" }));
    expect(pages.querySelectorAll("[data-pdf-page]")).toHaveLength(12);
    expect(screen.queryByRole("button", { name: "Ver más" })).not.toBeInTheDocument();
  });

  it("releases the PDF worker and render tasks when closed", async () => {
    const { unmount } = render(<PdfReader />);
    await screen.findByText(/Contenido de la práctica/);
    unmount();
    expect(mocks.destroy).toHaveBeenCalledOnce();
    expect(mocks.cancel).toHaveBeenCalled();
  });

  it("keeps the previous canvas visible until its replacement finishes rendering", async () => {
    const { container, rerender } = render(<PdfReader />);
    await screen.findByText(/Contenido de la práctica/);
    const previous = container.querySelector("canvas");
    let complete!: () => void;
    mocks.render.mockReturnValueOnce({ promise: new Promise<void>(resolve => { complete = resolve; }), cancel: mocks.cancel });
    rerender(<PdfReader openCycle={1} />);
    await waitFor(() => expect(mocks.render).toHaveBeenCalledTimes(2));
    expect(container.querySelector("canvas")).toBe(previous);
    complete();
    await waitFor(() => expect(container.querySelector("canvas")).not.toBe(previous));
  });

  it("offers recovery when the document fails to load", async () => {
    mocks.getDocument.mockReturnValueOnce({ promise: Promise.reject(new Error("offline")), destroy: mocks.destroy });
    render(<PdfReader />);
    await screen.findByRole("alert");
    expect(screen.getByRole("link", { name: "Abrir PDF original ↗" })).toHaveAttribute("href", "/documents/Practica-BxM-Matematicas-02-2026.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.getByLabelText("Páginas del documento de práctica")).toBeInTheDocument());
  });
});
