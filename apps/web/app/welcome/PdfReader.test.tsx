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
  it("renders the document in a keyboard-scrollable area without a toolbar", async () => {
    render(<PdfReader />);
    const pages = await screen.findByLabelText("Páginas del documento de práctica");
    expect(pages).toHaveAttribute("tabindex", "0");
    expect(pages.querySelectorAll("[data-pdf-page]")).toHaveLength(3);
    expect(screen.queryByRole("group", { name: "Controles del documento" })).not.toBeInTheDocument();
    await screen.findByText(/Contenido de la práctica/);
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
    await waitFor(() => expect(screen.getByLabelText("Páginas del documento de práctica")).toBeInTheDocument());
  });
});
