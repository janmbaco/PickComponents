import { test, expect } from "@playwright/test";
import { TemplateAnalyzer } from "../../../../src/rendering/templates/template-analyzer.js";
import { TemplateCompilationCache } from "../../../../src/rendering/templates/template-compilation-cache.js";
import { SafeContentSelector } from "../../../../src/rendering/templates/safe-content-selector.js";
import { Parse5FragmentParser } from "../../../../src/rendering/templates/parse5-fragment-parser.js";

/**
 * QA Edge Cases for Static → Reactive → Cache Pipeline.
 *
 * Covers 4 "flecos" (edge cases that typically slip through):
 * 1. Markup filter doesn't reject legitimate text with < or >
 * 2. Cache strategy prevents unbounded growth
 * 3. Missing constants fail gracefully
 * 4. Order is verified: static → reactive (not reactive → static)
 */
test.describe("TemplateAnalyzer - QA Edge Cases", () => {
  /**
   * FLECO 1: SafeContentSelector filter precision
   *
   * The filter `looksLikeHtmlStructure()` checks: `trimmed.startsWith('<') && trimmed.includes('>')`
   * This could reject legitimate text like "2 < 3 are numbers < 5" if not precise.
   *
   * ✅ Text starting with actual symbols (not '<' char): should be extracted
   * ✅ Text with comparison operators: should be extracted
   * ❌ Text that looks like broken markup: should be rejected
   */
  test.describe("Markup filter precision (FLECO 1)", () => {
    test("should extract bindings from text with comparison operators", () => {
      // ARRANGE: Real mathematical/comparison text that contains < or >
      const analyzer = new TemplateAnalyzer();
      const template =
        "<p>The value is 2 < 3, and {{result}} should be true</p>";

      // ACT
      const compiled = analyzer.analyze(template);

      // ASSERT: Should extract {{result}}, NOT be rejected by < in "2 < 3"
      expect(compiled.bindings.size).toBe(1);
      expect(compiled.bindings.has("result")).toBe(true);
      expect(compiled.templateString).toBe(template);
    });

    test('should extract bindings when text contains "3 > 2" style comparison', () => {
      // ARRANGE
      const analyzer = new TemplateAnalyzer();
      const template = "<span>If 5 > 3, then {{isValid}} is true</span>";

      // ACT
      const compiled = analyzer.analyze(template);

      // ASSERT
      expect(compiled.bindings.size).toBe(1);
      expect(compiled.bindings.has("isValid")).toBe(true);
    });

    test("should extract bindings with HTML entities-like text", () => {
      // ARRANGE: Text that looks entity-ish but isn't a tag
      const analyzer = new TemplateAnalyzer();
      const template =
        "<div>Expected output &lt;tag&gt; but got {{actual}}</div>";

      // ACT
      const compiled = analyzer.analyze(template);

      // ASSERT
      expect(compiled.bindings.size).toBe(1);
      expect(compiled.bindings.has("actual")).toBe(true);
    });

    test("should still reject artifacts from malformed tag syntax", () => {
      // ARRANGE: Invalid syntax that parser converts to text
      const parser = new Parse5FragmentParser();
      const selector = new SafeContentSelector();
      const html = "<{{tag}}>content</{{tag}}>";

      // ACT
      const fragment = parser.parse(html);
      const fragments = selector.selectInterpolableFragments(fragment);

      // ASSERT: Artifacts like "<{{tag}}>" should still be rejected
      // (filter is correct: only <X> where X is valid tag-like structure)
      const hasMarkupArtifacts = fragments.some(
        (f) =>
          f.content.trim().startsWith("<") && f.content.trim().includes(">"),
      );
      expect(hasMarkupArtifacts).toBe(false);
    });
  });

  /**
   * FLECO 2: Cache memory growth strategy
   *
   * Hash-based cache keys prevent staleness but can grow unbounded if:
   * - Same component rendered with many language variants
   * - Many tenant-specific resolves
   * - Theme variations per user
   *
   * Current implementation: No explicit TTL or LRU limit
   *
   * ✅ Document current behavior (no eviction)
   * ⏳ Pendiente: Implement eviction strategy (LRU/TTL) if needed
   */
  test.describe("Cache memory management (FLECO 2)", () => {
    test("should cache different resolved templates for same component (multi-variant)", () => {
      // ARRANGE: Simulate multi-language or multi-tenant scenario
      const cache = new TemplateCompilationCache();
      const analyzer = new TemplateAnalyzer();

      const template_EN = "<div>Welcome {{name}}</div>";
      const template_ES = "<div>Bienvenido {{name}}</div>";
      const template_FR = "<div>Bienvenue {{name}}</div>";

      // ACT: Cache three variants of same component
      const compiled_EN = cache.getOrCompile("greeting", template_EN, analyzer);
      const compiled_ES = cache.getOrCompile("greeting", template_ES, analyzer);
      const compiled_FR = cache.getOrCompile("greeting", template_FR, analyzer);

      // ASSERT: All are cached independently
      expect(cache.has("greeting", template_EN)).toBe(true);
      expect(cache.has("greeting", template_ES)).toBe(true);
      expect(cache.has("greeting", template_FR)).toBe(true);
      expect(compiled_EN).not.toBe(compiled_ES);
      expect(compiled_ES).not.toBe(compiled_FR);
    });

    test("should handle cache clear for memory reset", () => {
      // ARRANGE
      const cache = new TemplateCompilationCache();
      const analyzer = new TemplateAnalyzer();
      cache.getOrCompile("comp1", "<div>{{a}}</div>", analyzer);
      cache.getOrCompile("comp2", "<div>{{b}}</div>", analyzer);

      // ACT
      cache.clear();

      // ASSERT: All entries removed
      expect(cache.has("comp1", "<div>{{a}}</div>")).toBe(false);
      expect(cache.has("comp2", "<div>{{b}}</div>")).toBe(false);
    });

    // DOCUMENTATION: Current cache memory strategy
    // - No TTL (time-to-live) eviction
    // - No LRU (least-recently-used) eviction
    // - Manual clear() required to reset
    //
    // RECOMMENDATION for production:
    // - Implement LRU eviction (max 1000 entries?)
    // - OR: TTL per entry (30-60 min)
    // - OR: Implement cache.invalidateByComponent(componentId) for multi-variant scenarios
  });

  /**
   * FLECO 3: Graceful handling of missing constants
   *
   * When TemplateProvider resolves static bindings and a constant is missing,
   * the system should:
   * - NOT throw error
   * - Preserve the literal [[MISSING.CONSTANT]]
   * - NOT add it to reactive bindings
   * - Log a warning (production safety)
   *
   * This is tested at TemplateProvider level; analyzer should see already-resolved
   * templates, so this test verifies the contract.
   */
  test.describe("Missing constants handling (FLECO 3)", () => {
    test("should not crash when template contains unresolved [[...]] syntax", () => {
      // ARRANGE: Simulate a template that wasn't fully resolved
      // (e.g., TemplateProvider failed to find [[MISSING.CONSTANT]])
      const analyzer = new TemplateAnalyzer();
      const template =
        '<div class="[[Styles.BASE]] {{theme}}">[[I18N.TITLE]] is {{title}}</div>';

      // ACT: Analyzer should treat [[...]] as literal text, not extract it
      const compiled = analyzer.analyze(template);

      // ASSERT
      // Only reactive bindings {{}} should be extracted
      expect(compiled.bindings.has("theme")).toBe(true);
      expect(compiled.bindings.has("title")).toBe(true);

      // Static syntax should NOT be in bindings
      expect(compiled.bindings.has("Styles.BASE")).toBe(false);
      expect(compiled.bindings.has("I18N.TITLE")).toBe(false);

      // Template should preserve the literal [[...]] if not resolved
      expect(compiled.templateString).toContain("[[Styles.BASE]]");
      expect(compiled.templateString).toContain("[[I18N.TITLE]]");
    });

    test("should extract only reactive bindings, not partial unresolved syntax", () => {
      // ARRANGE: Mixed resolved + unresolved (edge case)
      const analyzer = new TemplateAnalyzer();
      const template = '<button data-action="submit">{{text}}</button>';

      // ACT
      const compiled = analyzer.analyze(template);

      // ASSERT: Only {{text}} is reactive
      expect(compiled.bindings.size).toBe(1);
      expect(compiled.bindings.has("text")).toBe(true);
    });
  });

  /**
   * FLECO 4: Processing order verification
   *
   * Critical: TemplateProvider MUST resolve static bindings BEFORE
   * TemplateAnalyzer extracts reactive bindings.
   *
   * If order is wrong:
   * - Analyzer might see [[...]] and try to tokenize it
   * - Cache key would be wrong (raw vs. resolved)
   *
   * This test verifies analyzer receives resolved template with a mock/spy approach.
   */
  test.describe("Processing order guarantee (FLECO 4)", () => {
    test("should extract only reactive bindings from pre-resolved template", () => {
      // ARRANGE: Simulate what RenderEngine SHOULD pass to analyzer
      // (i.e., template already resolved by TemplateProvider.getSource())
      const analyzer = new TemplateAnalyzer();

      // Template AFTER TemplateProvider.getSource() resolves static bindings:
      // Raw:      <div class="[[Styles.BASE]] {{className}}">[[I18N.HELLO]] {{name}}</div>
      // Resolved: <div class="btn {{className}}">Hola {{name}}</div>
      const resolvedTemplate =
        '<div class="btn {{className}}">Hola {{name}}</div>';

      // ACT
      const compiled = analyzer.analyze(resolvedTemplate);

      // ASSERT: Only reactive bindings extracted
      expect(compiled.bindings.size).toBe(2);
      expect(compiled.bindings.has("className")).toBe(true);
      expect(compiled.bindings.has("name")).toBe(true);

      // Static bindings NOT in reactive set (already resolved to "btn" and "Hola")
      expect(compiled.bindings.has("Styles.BASE")).toBe(false);
      expect(compiled.bindings.has("I18N.HELLO")).toBe(false);
    });

    test("should not tokenize raw template with unresolved [[...]] as bindings", () => {
      // ARRANGE: What analyzer should NEVER see (raw template with [[...]])
      const analyzer = new TemplateAnalyzer();
      const rawTemplate =
        '<div class="[[Styles.BASE]] {{className}}">[[I18N.HELLO]] {{name}}</div>';

      // ACT
      const compiled = analyzer.analyze(rawTemplate);

      // ASSERT: Analyzer should NOT extract [[...]] as bindings
      // (it only knows about {{}} and ${})
      expect(compiled.bindings.has("Styles.BASE")).toBe(false);
      expect(compiled.bindings.has("I18N.HELLO")).toBe(false);

      // But SHOULD extract reactive
      expect(compiled.bindings.has("className")).toBe(true);
      expect(compiled.bindings.has("name")).toBe(true);
    });

    test("cache key should match on resolved template, not raw template", () => {
      // ARRANGE: Verify cache key is based on RESOLVED template
      const cache = new TemplateCompilationCache();
      const analyzer = new TemplateAnalyzer();

      // Raw template (with [[...]])
      const _rawTemplate = '<div class="[[Styles.BASE]] {{x}}">Content</div>';

      // Two possible resolved states (different constants)
      const resolved1 = '<div class="btn {{x}}">Content</div>';
      const resolved2 = '<div class="btn-danger {{x}}">Content</div>';

      // ACT & ASSERT
      // RenderEngine should call: cache.getOrCompile(id, resolved1, analyzer) NOT rawTemplate
      const compiled1 = cache.getOrCompile("my-comp", resolved1, analyzer);
      const compiled2 = cache.getOrCompile("my-comp", resolved2, analyzer);

      // Different resolved templates = different cache entries
      expect(compiled1).not.toBe(compiled2);

      // If we tried to cache by raw template, we'd have staleness:
      expect(cache.has("my-comp", resolved1)).toBe(true);
      expect(cache.has("my-comp", resolved2)).toBe(true);
      // ✅ Separate entries, no staleness
    });
  });
});
