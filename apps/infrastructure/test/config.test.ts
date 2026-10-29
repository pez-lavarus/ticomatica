import { describe, expect, it } from "vitest";
import {
  PROJECT,
  resolveStage,
  resourcePrefix,
  stageSuffix,
} from "../src/config";

describe("resolveStage", () => {
  it("normalizes prod aliases to prod", () => {
    expect(resolveStage("prod")).toBe("prod");
    expect(resolveStage("production")).toBe("prod");
  });

  it("normalizes staging to staging", () => {
    expect(resolveStage("staging")).toBe("staging");
  });

  it("falls back to dev for unknown or missing input", () => {
    expect(resolveStage("dev")).toBe("dev");
    expect(resolveStage(undefined)).toBe("dev");
    expect(resolveStage("anything-else")).toBe("dev");
  });
});

describe("stageSuffix", () => {
  it("maps stages to display suffixes", () => {
    expect(stageSuffix("dev")).toBe("Dev");
    expect(stageSuffix("staging")).toBe("Staging");
    expect(stageSuffix("prod")).toBe("Prod");
  });
});

describe("resourcePrefix", () => {
  it("builds {project}-{stage} prefixes", () => {
    expect(resourcePrefix("dev")).toBe(`${PROJECT}-dev`);
    expect(resourcePrefix("prod")).toBe(`${PROJECT}-prod`);
  });
});
