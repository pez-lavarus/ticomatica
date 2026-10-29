import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FontScaleProvider, FONT_SCALE_STEPS, FONT_SCALE_STORAGE_KEY, DEFAULT_SCALE_INDEX } from "@/lib/font-scale";
import { FontScaleControl, HeaderIconButton, HeaderReadout, HeaderTextButton } from "./HeaderControls";

const heightClasses = (el: Element) => el.className.split(/\s+/).filter((c) => /^(md:)?h-\d+$/.test(c));

describe("header controls", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.removeProperty("--font-scale");
  });
  afterEach(cleanup);

  it("gives every control the same height at both breakpoints", () => {
    render(
      <FontScaleProvider>
        <HeaderReadout>
          <span>10:00</span>
        </HeaderReadout>
        <HeaderIconButton label="Pistas">i</HeaderIconButton>
        <HeaderTextButton label="Fórmulas" icon={<i />} />
        <HeaderTextButton label="Finalizar" tone="primary" icon={<i />} />
        <FontScaleControl />
      </FontScaleProvider>,
    );
    const controls = [
      screen.getByText("10:00").parentElement!,
      screen.getByRole("button", { name: "Pistas" }),
      screen.getByRole("button", { name: "Fórmulas" }),
      screen.getByRole("button", { name: "Finalizar" }),
      screen.getByRole("button", { name: "Reducir tamaño de texto" }),
      screen.getByRole("button", { name: "Aumentar tamaño de texto" }),
    ];
    const reference = heightClasses(controls[0]);
    expect(reference).toEqual(["h-8", "md:h-14"]);
    for (const control of controls) expect(heightClasses(control)).toEqual(reference);
  });

  it("makes the two font-size buttons identical apart from their sign", () => {
    render(
      <FontScaleProvider>
        <FontScaleControl />
      </FontScaleProvider>,
    );
    const smaller = screen.getByRole("button", { name: "Reducir tamaño de texto" });
    const larger = screen.getByRole("button", { name: "Aumentar tamaño de texto" });
    expect(smaller.className).toBe(larger.className);
    expect(smaller.innerHTML.replace("−", "+")).toBe(larger.innerHTML);
  });

  it("steps the scale, applies it to the page and remembers it", () => {
    render(
      <FontScaleProvider>
        <FontScaleControl />
      </FontScaleProvider>,
    );
    const smaller = screen.getByRole("button", { name: "Reducir tamaño de texto" });
    const larger = screen.getByRole("button", { name: "Aumentar tamaño de texto" });
    const applied = () => document.documentElement.style.getPropertyValue("--font-scale");

    expect(applied()).toBe(String(FONT_SCALE_STEPS[DEFAULT_SCALE_INDEX]));
    act(() => fireEvent.click(larger));
    expect(applied()).toBe(String(FONT_SCALE_STEPS[2]));
    expect(larger).toBeDisabled();
    expect(window.localStorage.getItem(FONT_SCALE_STORAGE_KEY)).toBe("2");

    act(() => fireEvent.click(smaller));
    act(() => fireEvent.click(smaller));
    expect(applied()).toBe(String(FONT_SCALE_STEPS[0]));
    expect(smaller).toBeDisabled();
  });

  it("starts from the saved size without first writing the default over it", () => {
    window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, "0");
    render(
      <FontScaleProvider>
        <FontScaleControl />
      </FontScaleProvider>,
    );
    expect(window.localStorage.getItem(FONT_SCALE_STORAGE_KEY)).toBe("0");
    expect(document.documentElement.style.getPropertyValue("--font-scale")).toBe("1");
    expect(screen.getByRole("button", { name: "Reducir tamaño de texto" })).toBeDisabled();
  });
});
