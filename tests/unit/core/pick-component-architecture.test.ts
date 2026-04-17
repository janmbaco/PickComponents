import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Audit tests to ensure PickComponent core does not contain DOM references
 */
test.describe("Core Architecture - PickComponent Purity", () => {
  test("should not contain HTMLElement imports or types in pick-component.ts", () => {
    const filePath = join(process.cwd(), "src", "core", "pick-component.ts");
    const content = readFileSync(filePath, "utf-8");

    // Should not contain prohibited patterns
    expect(content).not.toMatch(/\bHTMLElement\b/);
    expect(content).not.toMatch(/\bElement\b(?!ary)/);
    expect(content).not.toMatch(/querySelector/);
  });

  test("should not have index signature [key: string] for arbitrary property assignment", () => {
    const filePath = join(process.cwd(), "src", "core", "pick-component.ts");
    const content = readFileSync(filePath, "utf-8");

    // Explicitly check for index signature
    expect(content).not.toMatch(/\[key:\s*string\]:\s*(any|unknown)/);
  });

  test("should not have hostElementRef property or setHostElement method", () => {
    const filePath = join(process.cwd(), "src", "core", "pick-component.ts");
    const content = readFileSync(filePath, "utf-8");

    expect(content).not.toMatch(/hostElementRef/);
    expect(content).not.toMatch(/setHostElement/);
    expect(content).not.toMatch(/private\s+_hostElement/);
  });
});
