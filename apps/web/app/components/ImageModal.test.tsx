import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ImageModal from "./ImageModal";
import { QuestionStatement } from "./assessment/QuestionStatement";
import { ResponseOptions } from "./assessment/ResponseOptions";
import { quizData } from "@/lib/question-bank";

const slot = { register: () => {}, rect: null, animate: false };
const svg = '<svg viewBox="0 0 580 506"><style>.axis{fill:none;stroke:currentColor}</style><path class="axis" d="M0 0L580 506" /></svg>';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Graph enlargement", () => {
  it("opens a statement graph with one click and includes its preferred SVG", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(svg)));
    const question = quizData.questions.find((q) => q.original_number === 12)!;
    const onOpen = vi.fn();
    render(<QuestionStatement question={question} sharedImageSrc={question.graph_image!} slot={slot} onOpenImageModal={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "Ampliar imagen de apoyo" }));
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(question.graph_image, "Imagen de apoyo", question.graph_svg);
  });

  it("enlarges an option graph without selecting an answer, including during review", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(svg)));
    const question = quizData.questions.find((q) => q.original_number === 6)!;
    const option = question.options[0];
    const onSelect = vi.fn();
    const onOpen = vi.fn();
    const { rerender } = render(<ResponseOptions question={question} slot={slot} onSelect={onSelect} onOpenImageModal={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: `Ampliar gráfica de opción ${option.label}` }));
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(option.image, `Opción ${option.label}`, option.svg);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: `Seleccionar opción ${option.label}` }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(option.label);

    rerender(<ResponseOptions question={question} slot={slot} onSelect={onSelect} onOpenImageModal={onOpen} readOnly />);
    expect(screen.getByRole("button", { name: `Seleccionar opción ${option.label}` })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: `Ampliar gráfica de opción ${option.label}` }));
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("renders the enlarged inline vector without a white surface and restores focus on close", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(svg)));
    const onClose = vi.fn();
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const previousOverflow = document.body.style.overflow;
    const props = { src: "/zoom.png", svg: "/zoom.svg", alt: "Gráfica ampliada", isOpen: true, onClose };
    const { container, rerender } = render(<ImageModal {...props} />);
    await waitFor(() => expect(container.querySelector(".graph-svg-expanded svg")).not.toBeNull());
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".bg-white")).toBeNull();
    expect(screen.getByRole("dialog", { name: "Gráfica ampliada" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar imagen ampliada" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    rerender(<ImageModal {...props} isOpen={false} />);
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe(previousOverflow);
    trigger.remove();
  });

  it("retains a raster fallback when a vector is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    const { container } = render(<ImageModal src="/zoom-fallback.png" svg="/zoom-missing.svg" alt="Fallback graph" isOpen onClose={() => {}} />);
    await waitFor(() => expect(container.querySelector('img[alt="Fallback graph"]')).not.toBeNull());
    expect(container.querySelector('img[alt="Fallback graph"]')).toHaveAttribute("src", expect.stringContaining("zoom-fallback.png"));
  });
});
