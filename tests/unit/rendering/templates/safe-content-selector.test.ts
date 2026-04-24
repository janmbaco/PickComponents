import { test, expect } from "@playwright/test";
import { Parse5FragmentParser } from "../../../../src/rendering/templates/parse5-fragment-parser.js";
import { SafeContentSelector } from "../../../../src/rendering/templates/safe-content-selector.js";

const parser = new Parse5FragmentParser();
const selector = new SafeContentSelector();

function select(html: string) {
  const fragment = parser.parse(html);
  return selector.selectInterpolableFragments(fragment);
}

/**
 * Tests for SafeContentSelector (HTML context filtering only).
 */
test.describe("SafeContentSelector", () => {
  test("should select text node content", () => {
    // Arrange
    const html = "<div>Hello {{name}}</div>";

    // Act
    const fragments = select(html);

    // Assert
    expect(fragments).toHaveLength(1);
    expect(fragments[0].type).toBe("text");
    expect(fragments[0].content).toContain("{{name}}");
  });

  test("should select allowed attribute values", () => {
    // Arrange
    const html = '<div data-id="{{id}}" aria-label="{{label}}"></div>';

    // Act
    const fragments = select(html);

    // Assert
    expect(fragments.map((f) => f.type)).toEqual(["attribute", "attribute"]);
    expect(fragments.map((f) => f.content)).toEqual(["{{id}}", "{{label}}"]);
  });

  test("should exclude script/style/template content", () => {
    // Arrange
    const html =
      "<div>{{ok}}</div><script>{{no}}</script><style>{{no2}}</style><template>{{no3}}</template>";

    // Act
    const fragments = select(html);

    // Assert
    expect(fragments).toHaveLength(1);
    expect(fragments[0].content).toContain("{{ok}}");
  });

  test("should exclude event handler and style attributes", () => {
    // Arrange
    const html =
      '<button onclick="{{no}}" style="color: {{no2}}" data-val="{{yes}}">{{text}}</button>';

    // Act
    const fragments = select(html);

    // Assert
    expect(fragments.map((f) => f.content)).toEqual(["{{yes}}", "{{text}}"]);
  });

  test("should exclude srcdoc attributes", () => {
    // Arrange
    const html = '<iframe srcdoc="{{no}}" data-val="{{yes}}"></iframe>';

    // Act
    const fragments = select(html);

    // Assert
    expect(fragments.map((f) => f.content)).toEqual(["{{yes}}"]);
  });

  test("should exclude artifacts from invalid tag names", () => {
    // Arrange
    const html = "<{{tag}}></{{tag}}>";

    // Act
    const fragments = select(html);

    // Assert
    expect(fragments).toHaveLength(0);
  });

  test("should exclude HTML comments", () => {
    // Arrange
    const html = "<div>{{yes}}</div><!-- {{no}} -->";

    // Act
    const fragments = select(html);

    // Assert
    expect(fragments).toHaveLength(1);
    expect(fragments[0].content).toContain("{{yes}}");
  });

  /**
   * Markup filter precision tests (QA FLECO 1).
   *
   * SafeContentSelector filters text nodes that "look like HTML structure"
   * to exclude artifacts from invalid syntax like <{{tag}}>.
   *
   * Filter: `trimmed.startsWith('<') && trimmed.includes('>')`
   *
   * ✅ Should reject: "<tag>" or "< invalid markup >"
   * ✅ Should accept: "2 < 3" or "value > 5" (real content with symbols)
   */
  test.describe("Markup filter precision", () => {
    test("should include text with comparison operators (2 < 3)", () => {
      // Arrange: Real text with < symbol but not markup
      const html = "<p>The condition is 2 < 3 and {{result}} is true</p>";

      // Act
      const fragments = select(html);

      // Assert: Should extract the binding, not reject the text node
      expect(fragments.length).toBeGreaterThan(0);
      const hasBinding = fragments.some((f) =>
        f.content.includes("{{result}}"),
      );
      expect(hasBinding).toBe(true);
    });

    test("should include text with reverse comparison operators (5 > 3)", () => {
      // Arrange
      const html = "<div>If 5 > 3 then {{valid}} is true</div>";

      // Act
      const fragments = select(html);

      // Assert
      const hasBinding = fragments.some((f) => f.content.includes("{{valid}}"));
      expect(hasBinding).toBe(true);
    });

    test("should include text with HTML entity-like content", () => {
      // Arrange: Text that contains & and ; or looks entity-ish but not a tag
      const html =
        "<span>Result: &lt;tag&gt; was expected, got {{actual}}</span>";

      // Act
      const fragments = select(html);

      // Assert
      const hasBinding = fragments.some((f) =>
        f.content.includes("{{actual}}"),
      );
      expect(hasBinding).toBe(true);
    });

    test("should still exclude malformed tag artifacts", () => {
      // Arrange: Invalid syntax that parse5 converts to malformed text
      const html = "<{{tag}}>should not appear</{{tag}}>";

      // Act
      const fragments = select(html);

      // Assert: Artifacts should still be excluded
      // The <{{tag}}> becomes a text artifact and should be filtered
      const hasMarkupArtifacts = fragments.some(
        (f) =>
          f.content.trim().startsWith("<") &&
          f.content.trim().includes(">") &&
          f.content.includes("{{"),
      );
      expect(hasMarkupArtifacts).toBe(false);
    });

    test("should handle boundary case: text starting with < but no >", () => {
      // Arrange: Text that starts with < but has no closing >
      const html =
        "<div>The symbol < is interesting, and {{value}} matters</div>";

      // Act
      const fragments = select(html);

      // Assert: Should be included (not markup-like, no >)
      const hasBinding = fragments.some((f) => f.content.includes("{{value}}"));
      expect(hasBinding).toBe(true);
    });

    test("should handle boundary case: text with > but no leading <", () => {
      // Arrange
      const html = "<div>Result should be > 100, and {{passes}} the test</div>";

      // Act
      const fragments = select(html);

      // Assert: Should be included (doesn't start with <)
      const hasBinding = fragments.some((f) =>
        f.content.includes("{{passes}}"),
      );
      expect(hasBinding).toBe(true);
    });
  });
});
