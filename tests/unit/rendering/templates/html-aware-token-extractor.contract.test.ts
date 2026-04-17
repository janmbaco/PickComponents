import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { HtmlAwareTokenExtractor } from "../../../../src/rendering/templates/html-aware-token-extractor.js";
import { Parse5FragmentParser } from "../../../../src/rendering/templates/parse5-fragment-parser.js";
import { SafeContentSelector } from "../../../../src/rendering/templates/safe-content-selector.js";
import { DelimitedTokenExtractor } from "../../../../src/rendering/templates/delimited-token-extractor.js";
import { CompositeTokenExtractor } from "../../../../src/rendering/templates/composite-token-extractor.js";

/**
 * Contract tests for HtmlAwareTokenExtractor (parsing + selection + string extraction).
 */
test.describe("HtmlAwareTokenExtractor (contract)", () => {
  test("should extract only from allowed contexts (text + allowed attributes)", () => {
    // Arrange
    const parser = new Parse5FragmentParser();
    const selector = new SafeContentSelector();
    const mustache = new DelimitedTokenExtractor("{{", "}}", "binding");
    const stringExtractor = new CompositeTokenExtractor([mustache]);
    const extractor = new HtmlAwareTokenExtractor(
      parser,
      selector,
      stringExtractor,
    );

    const template = `
      <div class="{{className}}" onclick="{{no1}}" style="color: {{no2}}">
        {{title}}
        <!-- {{no3}} -->
        <script>{{no4}}</script>
        <style>{{no5}}</style>
        <span data-value="{{dataValue}}">{{message}}</span>
      </div>
    `;

    // Act
    const tokens = extractor.extract(template);
    const bindings = new Set(
      tokens.filter((t) => t.kind === "binding").map((t) => t.value),
    );

    // Assert
    expect(bindings).toEqual(
      new Set(["className", "title", "dataValue", "message"]),
    );
  });

  test("should avoid markup tokenization in tag or attribute names", () => {
    // Arrange
    const parser = new Parse5FragmentParser();
    const selector = new SafeContentSelector();
    const mustache = new DelimitedTokenExtractor("{{", "}}", "binding");
    const stringExtractor = new CompositeTokenExtractor([mustache]);
    const extractor = new HtmlAwareTokenExtractor(
      parser,
      selector,
      stringExtractor,
    );
    const template =
      '<{{tag}} data-{{x}}="1" {{attr}}="x">{{prop}}</{{tag}}><div>{{prop}}</div>';

    // Act
    const tokens = extractor.extract(template);
    const bindings = tokens
      .filter((token) => token.kind === "binding")
      .map((token) => token.value);

    // Assert
    expect(bindings).toEqual(["prop"]);
  });

  test("should compose multiple dialects ({{}} and ${})", () => {
    // Arrange
    const parser = new Parse5FragmentParser();
    const selector = new SafeContentSelector();
    const mustache = new DelimitedTokenExtractor("{{", "}}", "binding");
    const dollar = new DelimitedTokenExtractor("${", "}", "binding");
    const stringExtractor = new CompositeTokenExtractor([mustache, dollar]);
    const extractor = new HtmlAwareTokenExtractor(
      parser,
      selector,
      stringExtractor,
    );
    const template = '<div class="${theme}">{{message}} ${extra}</div>';

    // Act
    const tokens = extractor.extract(template);
    const bindings = new Set(tokens.map((t) => t.value));

    // Assert
    expect(bindings).toEqual(new Set(["theme", "message", "extra"]));
  });

  test("should ignore constants/rules when they are not binding kind", () => {
    // Arrange
    const parser = new Parse5FragmentParser();
    const selector = new SafeContentSelector();
    const binding = new DelimitedTokenExtractor("{{", "}}", "binding");
    const rule = new DelimitedTokenExtractor("[[RULES.", "]]", "rule");
    const constant = new DelimitedTokenExtractor("[[", "]]", "constant");
    const stringExtractor = new CompositeTokenExtractor([
      binding,
      rule,
      constant,
    ]);
    const extractor = new HtmlAwareTokenExtractor(
      parser,
      selector,
      stringExtractor,
    );
    const template =
      '<input data-rule="[[RULES.username]]" value="{{username}}" data-constant="[[Styles.BUTTON]]" />';

    // Act
    const tokens = extractor.extract(template);
    const bindings = tokens
      .filter((t) => t.kind === "binding")
      .map((t) => t.value);

    // Assert
    expect(bindings).toEqual(["username"]);
  });

  test("should delegate to injected parser/selector/extractor (DIP)", () => {
    // Arrange
    const mockParser = {
      parse: (html: string) => ({ html }),
    };
    const mockSelector = {
      selectInterpolableFragments: (parsed: any) => [
        { content: parsed.html, type: "text" as const },
      ],
    };
    const mockStringExtractor = {
      extract: (text: string) => [
        {
          kind: "binding" as const,
          value: text,
          raw: text,
          start: 0,
          end: text.length,
        },
      ],
    };
    const extractor = new HtmlAwareTokenExtractor(
      mockParser as any,
      mockSelector as any,
      mockStringExtractor as any,
    );

    // Act
    const tokens = extractor.extract("<div>{{value}}</div>");

    // Assert
    expect(tokens).toHaveLength(1);
    expect(tokens[0].value).toBe("<div>{{value}}</div>");
  });

  test("should stay small to keep contracts focused (anti-growth)", () => {
    // Arrange
    const thisFilePath = fileURLToPath(import.meta.url);
    const fileContents = readFileSync(thisFilePath, "utf8");
    const occurrences = (fileContents.match(/\b(?:test|it)\s*\(/g) ?? [])
      .length;

    // Act
    const maxTestsAllowed = 8;

    // Assert
    expect(occurrences).toBeLessThanOrEqual(maxTestsAllowed);
  });
});
