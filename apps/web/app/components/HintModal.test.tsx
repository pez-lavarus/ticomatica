import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HintModal from "./HintModal";

const hints = [{ hint: "Conserva el radio", keywords: ["radio"], explanation: "Una traslación solo cambia el centro." }];
const formulas = [{ name: "Traslación", formula: "(x,y)\\mapsto(x+a,y+b)", explanation: "El vector indica el desplazamiento." }];

describe("question help tabs", () => {
  it("starts with concept hints and separates formulas from the previous solution content", () => {
    render(<HintModal hints={hints} formulas={formulas} answerSteps={["Solución anterior"]} />);
    expect(screen.getByRole("tab", { name: "Pistas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(hints[0].hint)).toBeVisible();
    expect(screen.getByText(hints[0].explanation).closest("div")).toHaveClass("font-serif");
    expect(screen.queryByText("Solución anterior")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Fórmulas" }));
    expect(screen.getByText(formulas[0].explanation)).toBeVisible();
    expect(screen.getByRole("tabpanel").querySelector(".katex-display")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Respuesta" }));
    expect(screen.getByText("Paso 1")).toBeVisible();
    expect(screen.getByText("Solución anterior")).toBeVisible();
    expect(screen.queryByText(hints[0].hint)).not.toBeInTheDocument();
  });

  it("explains when a question has no relevant formula", () => {
    render(<HintModal hints={hints} formulas={[]} />);
    fireEvent.click(screen.getByRole("tab", { name: "Fórmulas" }));
    expect(screen.getByText(/no requiere una fórmula específica/)).toBeVisible();
    expect(screen.getByRole("tabpanel").querySelector(".katex")).not.toBeInTheDocument();
  });

  it("supports keyboard tab navigation with matching panel labels", () => {
    render(<HintModal />);
    const first = screen.getByRole("tab", { name: "Pistas" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    const last = screen.getByRole("tab", { name: "Respuesta" });
    expect(last).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", last.id);
    fireEvent.keyDown(last, { key: "Home" });
    expect(first).toHaveFocus();
    expect(screen.getByText("No hay pistas disponibles para esta pregunta.")).toBeVisible();
    fireEvent.keyDown(first, { key: "End" });
    expect(last).toHaveFocus();
  });
});
