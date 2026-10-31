import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HintModal from "./HintModal";

describe("HintModal component", () => {
  it("renders hints with matching typography font-serif and text sizes", () => {
    const hints = ["Pista paso 1", "Pista paso 2"];
    render(<HintModal hints={hints} keywords={["Álgebra"]} hintStrategy="Estrategia recomendada" />);

    expect(screen.getByText("Pistas de la Pregunta")).toBeInTheDocument();
    expect(screen.getByText("Pista paso 1")).toBeInTheDocument();

    const hintContainer = screen.getByText("Pista paso 1").closest("div");
    expect(hintContainer).toHaveClass("text-base", "md:text-lg", "font-serif");

    const strategyContainer = screen.getByText("Estrategia recomendada").closest("div");
    expect(strategyContainer).toHaveClass("text-sm", "md:text-base", "font-serif");
  });

  it("renders empty state message with serif typography when no hints available", () => {
    render(<HintModal hints={[]} />);
    const emptyMsg = screen.getByText("No hay pistas disponibles para esta pregunta.");
    expect(emptyMsg).toHaveClass("text-base", "md:text-lg", "font-serif");
  });
});
