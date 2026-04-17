import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { TemplateAnalyzer } from "../../../../src/rendering/templates/template-analyzer.js";
import { TemplateToken } from "../../../../src/rendering/templates/template-token.interface.js";

/**
 * Contract tests for TemplateAnalyzer covering binding extraction and filtering.
 */
test.describe("TemplateAnalyzer (contract)", () => {
  test("should extract bindings from text and attributes", () => {
    // Arrange
    const html = '<div class="{{className}}">Hello, {{name}}!</div>';
    const analyzer = new TemplateAnalyzer();

    // Act
    const compiled = analyzer.analyze(html);

    // Assert
    expect(compiled.bindings).toEqual(new Set(["className", "name"]));
  });

  test("should support nested elements and attributes", () => {
    // Arrange
    const html = `
      <section data-id="{{sectionId}}">
        <article>
          <header>{{headline}}</header>
          <p title="{{tooltip}}">{{body}}</p>
        </article>
      </section>
    `;
    const analyzer = new TemplateAnalyzer();

    // Act
    const compiled = analyzer.analyze(html);

    // Assert
    expect(compiled.bindings).toEqual(
      new Set(["sectionId", "headline", "tooltip", "body"]),
    );
  });

  test("should ignore duplicate binding names but keep unique tokens", () => {
    // Arrange
    const html = "<div>{{name}} {{name}} {{title}}</div>";
    const analyzer = new TemplateAnalyzer();

    // Act
    const compiled = analyzer.analyze(html);

    // Assert
    expect(compiled.bindings).toEqual(new Set(["name", "title"]));
  });

  test("should handle empty templates", () => {
    // Arrange
    const analyzer = new TemplateAnalyzer();

    // Act
    const compiled = analyzer.analyze("");

    // Assert
    expect(compiled.bindings.size).toBe(0);
  });

  test("should collect only binding tokens from extractor (DIP)", () => {
    // Arrange
    const tokens: TemplateToken[] = [
      { kind: "binding", value: "name", raw: "{{name}}", start: 0, end: 0 },
      {
        kind: "rule",
        value: "RULES.username",
        raw: "[[RULES.username]]",
        start: 0,
        end: 0,
      },
    ];
    const extractor = { extract: () => tokens };
    const analyzer = new TemplateAnalyzer(extractor as any);

    // Act
    const compiled = analyzer.analyze("<div>{{name}}</div>");

    // Assert
    expect(compiled.bindings).toEqual(new Set(["name"]));
  });

  test("should stay small to keep contracts focused (anti-growth)", () => {
    // Arrange
    const thisFilePath = fileURLToPath(import.meta.url);
    const fileContents = readFileSync(thisFilePath, "utf8");
    const occurrences = (fileContents.match(/\b(?:test|it)\s*\(/g) ?? [])
      .length;

    // Act
    const maxTestsAllowed = 12;

    // Assert
    expect(occurrences).toBeLessThanOrEqual(maxTestsAllowed);
  });
});
