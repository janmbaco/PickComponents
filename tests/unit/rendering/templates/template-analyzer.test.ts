import { test as base, expect } from "@playwright/test";
import { TemplateAnalyzer } from "../../../../src/rendering/templates/template-analyzer.js";
import { DelimitedTokenExtractor } from "../../../../src/rendering/templates/delimited-token-extractor.js";
import { CompositeTokenExtractor } from "../../../../src/rendering/templates/composite-token-extractor.js";
import { TemplateMother } from "../../../fixtures/template.mother.js";
import type {
  ITemplateTokenExtractor,
  TemplateToken,
} from "../../../../src/rendering/templates/template-token.interface.js";

/**
 * Fixture for TemplateAnalyzer tests.
 * Provides isolated instance of TemplateAnalyzer.
 */
type TemplateAnalyzerFixture = {
  analyzer: TemplateAnalyzer;
};

/**
 * Extended Playwright test with TemplateAnalyzer fixtures.
 */
const test = base.extend<TemplateAnalyzerFixture>({
  analyzer: async ({}, use) => {
    const analyzer = new TemplateAnalyzer();
    await use(analyzer);
  },
});

/**
 * Tests for TemplateAnalyzer responsibility.
 *
 * Covers:
 * - Binding extraction from templates
 * - Support for nested properties and special characters
 * - Template validation and error handling
 * - Compiled template cloning
 */
test.describe("TemplateAnalyzer", () => {
  /**
   * Template binding extraction tests.
   * Validates binding detection in templates and attributes.
   */
  test.describe("analyze()", () => {
    test("should extract single binding from template", ({ analyzer }) => {
      // Arrange
      const template = "<div>{{message}}</div>";

      // Act
      const compiled = analyzer.analyze(template);

      // Assert
      expect(compiled.templateString).toBe(template);
      expect(compiled.bindings.size).toBe(1);
      expect(compiled.bindings.has("message")).toBe(true);
    });

    test("should extract multiple bindings from template", ({ analyzer }) => {
      // Arrange
      const template =
        '<div class="{{className}}">{{title}} - {{count}} items</div>';

      // Act
      const compiled = analyzer.analyze(template);

      // Assert
      expect(compiled.bindings.size).toBe(3);
      expect(compiled.bindings.has("className")).toBe(true);
      expect(compiled.bindings.has("title")).toBe(true);
      expect(compiled.bindings.has("count")).toBe(true);
    });

    test("should extract nested property bindings", ({ analyzer }) => {
      // Arrange
      const template = "<div>{{user.profile.name}} ({{user.email}})</div>";

      // Act
      const compiled = analyzer.analyze(template);

      // Assert
      expect(compiled.bindings.size).toBe(2);
      expect(compiled.bindings.has("user.profile.name")).toBe(true);
      expect(compiled.bindings.has("user.email")).toBe(true);
    });

    test("should handle template with no bindings", ({ analyzer }) => {
      // Arrange
      const template = "<div>Static content only</div>";

      // Act
      const compiled = analyzer.analyze(template);

      // Assert
      expect(compiled.templateString).toBe(template);
      expect(compiled.bindings.size).toBe(0);
    });

    test("should trim whitespace inside bindings", ({ analyzer }) => {
      // Arrange
      const template = "<div>{{ message }}</div>";

      // Act
      const compiled = analyzer.analyze(template);

      // Assert
      expect(compiled.bindings.has("message")).toBe(true);
    });

    test("should extract bindings from attributes", ({ analyzer }) => {
      // Arrange
      const template =
        '<input type="text" value="{{username}}" placeholder="{{hint}}" />';

      // Act
      const compiled = analyzer.analyze(template);

      // Assert
      expect(compiled.bindings.size).toBe(2);
      expect(compiled.bindings.has("username")).toBe(true);
      expect(compiled.bindings.has("hint")).toBe(true);
    });

    test("should handle multiple bindings in single attribute", ({
      analyzer,
    }) => {
      // Arrange
      const template =
        '<div class="{{prefix}}-{{theme}}-{{size}}">Content</div>';

      // Act
      const compiled = analyzer.analyze(template);

      // Assert
      expect(compiled.bindings.size).toBe(3);
      expect(compiled.bindings.has("prefix")).toBe(true);
      expect(compiled.bindings.has("theme")).toBe(true);
      expect(compiled.bindings.has("size")).toBe(true);
    });

    test("should handle duplicate bindings (only store once)", ({
      analyzer,
    }) => {
      // Arrange
      const template = "<div>{{message}} and {{message}} again</div>";

      // Act
      const compiled = analyzer.analyze(template);

      // Assert
      expect(compiled.bindings.size).toBe(1);
      expect(compiled.bindings.has("message")).toBe(true);
    });

    test("should extract bindings with special characters", ({ analyzer }) => {
      // Arrange
      const template = "<div>{{user_name}} {{$index}} {{data-value}}</div>";

      // Act
      const compiled = analyzer.analyze(template);

      // Assert
      expect(compiled.bindings.size).toBe(3);
      expect(compiled.bindings.has("user_name")).toBe(true);
      expect(compiled.bindings.has("$index")).toBe(true);
      expect(compiled.bindings.has("data-value")).toBe(true);
    });

    test("should throw error when template is null", ({ analyzer }) => {
      // Act & Assert
      expect(() => analyzer.analyze(null as any)).toThrow(
        "Template is required",
      );
    });

    test("should throw error when template is undefined", ({ analyzer }) => {
      // Act & Assert
      expect(() => analyzer.analyze(undefined as any)).toThrow(
        "Template is required",
      );
    });

    test("should allow empty string template", ({ analyzer }) => {
      // Act
      const compiled = analyzer.analyze("");

      // Assert
      expect(compiled.bindings.size).toBe(0);
      expect(compiled.templateString).toBe("");
    });
  });

  /**
   * Compiled template cloning tests.
   * Validates that clones are independent copies.
   */
  test.describe("ICompiledTemplate.clone()", () => {
    test("should create independent clone of compiled template", ({
      analyzer,
    }) => {
      // Arrange
      const template = "<div>{{message}}</div>";
      const compiled = analyzer.analyze(template);

      // Act
      const clone = compiled.clone();

      // Assert
      expect(clone.templateString).toBe(compiled.templateString);
      expect(clone.bindings.size).toBe(compiled.bindings.size);
      expect(clone.bindings).not.toBe(compiled.bindings); // Different Set instance
    });

    test("should clone bindings as independent Set", ({ analyzer }) => {
      // Arrange
      const compiled = analyzer.analyze("<div>{{message}}</div>");
      const clone = compiled.clone();

      // Act
      clone.bindings.add("newBinding");

      // Assert
      expect(clone.bindings.has("newBinding")).toBe(true);
      expect(compiled.bindings.has("newBinding")).toBe(false);
    });
  });

  /**
   * Integration tests with TemplateMother.
   * Validates analyzer with complex fixture templates.
   */
  test.describe("Integration with TemplateMother", () => {
    test("should analyze complex template from fixture", ({ analyzer }) => {
      // Arrange
      const template = TemplateMother.createTemplateWithReactiveBindings();

      // Act
      const compiled = analyzer.analyze(template);

      // Assert
      expect(compiled.bindings.has("theme")).toBe(true);
      expect(compiled.bindings.has("title")).toBe(true);
      expect(compiled.bindings.has("description")).toBe(true);
      expect(compiled.bindings.has("count")).toBe(true);
    });
  });

  test.describe("Dialect handling", () => {
    test("should ignore static constants [[CONSTANT]] by default", () => {
      // Arrange
      const analyzer = new TemplateAnalyzer();
      const template = '<div class="[[Styles.CARD]]">{{title}}</div>';

      // Act
      const compiled = analyzer.analyze(template);

      // Assert
      expect(compiled.bindings.size).toBe(1);
      expect(compiled.bindings.has("title")).toBe(true);
    });

    test("should support additional dialect via injected extractor", () => {
      // Arrange
      const bindingExtractor = new DelimitedTokenExtractor(
        "{{",
        "}}",
        "binding",
      );
      const dollarExtractor = new DelimitedTokenExtractor("${", "}", "binding");
      const analyzer = new TemplateAnalyzer(
        new CompositeTokenExtractor([bindingExtractor, dollarExtractor]),
      );
      const template = "<div>{{title}} - ${subtitle}</div>";

      // Act
      const compiled = analyzer.analyze(template);

      // Assert
      expect(compiled.bindings.size).toBe(2);
      expect(compiled.bindings.has("title")).toBe(true);
      expect(compiled.bindings.has("subtitle")).toBe(true);
    });

    test("should support rule/constant tokens without leaking into bindings", () => {
      // Arrange
      const bindingExtractor = new DelimitedTokenExtractor(
        "{{",
        "}}",
        "binding",
      );
      const rulesExtractor = new DelimitedTokenExtractor(
        "[[RULES.",
        "]]",
        "rule",
      );
      const constantsExtractor = new DelimitedTokenExtractor(
        "[[",
        "]]",
        "constant",
      );
      const analyzer = new TemplateAnalyzer(
        new CompositeTokenExtractor([
          bindingExtractor,
          rulesExtractor,
          constantsExtractor,
        ]),
      );
      const template =
        '<input [[RULES.username]] class="[[Styles.INPUT]]" value="{{username}}">';

      // Act
      const compiled = analyzer.analyze(template);

      // Assert
      expect(compiled.bindings.size).toBe(1);
      expect(compiled.bindings.has("username")).toBe(true);
    });

    test("should delegate to injected extractor (DIP characterization)", () => {
      // Arrange
      const mockExtractor: ITemplateTokenExtractor = {
        extract: (template: string): TemplateToken[] => {
          return template.includes("flag")
            ? [
                {
                  kind: "binding",
                  value: "flag",
                  raw: "{{flag}}",
                  start: 0,
                  end: 0,
                },
              ]
            : [];
        },
      };
      const analyzer = new TemplateAnalyzer(mockExtractor);

      // Act
      const compiled = analyzer.analyze("<div>{{flag}}</div>");

      // Assert
      expect(compiled.bindings.size).toBe(1);
      expect(compiled.bindings.has("flag")).toBe(true);
    });

    test("should ignore incomplete delimiters", () => {
      // Arrange
      const analyzer = new TemplateAnalyzer();
      const template = "<div>{{message</div>";

      // Act
      const compiled = analyzer.analyze(template);

      // Assert
      expect(compiled.bindings.size).toBe(0);
    });
  });
});
