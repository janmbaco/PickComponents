import { test as base, expect } from "@playwright/test";
import { TemplateCompilationCache } from "../../../../src/rendering/templates/template-compilation-cache.js";
import { TemplateAnalyzer } from "../../../../src/rendering/templates/template-analyzer.js";

/**
 * Fixture for TemplateCompilationCache tests.
 * Provides isolated instances of cache and analyzer.
 */
type TemplateCompilationCacheFixture = {
  cache: TemplateCompilationCache;
  analyzer: TemplateAnalyzer;
};

/**
 * Extended Playwright test with TemplateCompilationCache fixtures.
 */
const test = base.extend<TemplateCompilationCacheFixture>({
  cache: async ({}, use) => {
    const cache = new TemplateCompilationCache();
    await use(cache);
    cache.clear(); // Cleanup after each test
  },

  analyzer: async ({}, use) => {
    const analyzer = new TemplateAnalyzer();
    await use(analyzer);
  },
});

/**
 * Tests for TemplateCompilationCache responsibility.
 *
 * Covers:
 * - Caching compiled templates by componentId
 * - Reusing cached templates on subsequent calls
 * - Cache lookup and existence checks
 * - Cache clearing and cleanup
 */
test.describe("TemplateCompilationCache", () => {
  /**
   * Template compilation and caching tests.
   * Validates getOrCompile method behavior.
   */
  test.describe("getOrCompile()", () => {
    test("should compile and cache template on first call", ({
      cache,
      analyzer,
    }) => {
      // Arrange
      const componentId = "my-component";
      const template = "<div>{{count}}</div>";

      // Act
      const compiled = cache.getOrCompile(componentId, template, analyzer);

      // Assert
      expect(compiled).toBeDefined();
      expect(compiled.templateString).toBe(template);
      expect(compiled.bindings.size).toBe(1);
      expect(compiled.bindings.has("count")).toBe(true);
    });

    test("should return cached template on subsequent calls", ({
      cache,
      analyzer,
    }) => {
      // Arrange
      const componentId = "my-component";
      const template = "<div>{{message}}</div>";

      // Act
      const first = cache.getOrCompile(componentId, template, analyzer);
      const second = cache.getOrCompile(componentId, template, analyzer);

      // Assert
      expect(first).toBe(second); // Same reference
    });

    test("should cache multiple different templates by componentId", ({
      cache,
      analyzer,
    }) => {
      // Arrange
      const template1 = "<div>{{value1}}</div>";
      const template2 = "<div>{{value2}}</div>";

      // Act
      const compiled1 = cache.getOrCompile("component-a", template1, analyzer);
      const compiled2 = cache.getOrCompile("component-b", template2, analyzer);
      const cached1 = cache.getOrCompile("component-a", template1, analyzer);
      const cached2 = cache.getOrCompile("component-b", template2, analyzer);

      // Assert
      expect(compiled1).toBe(cached1);
      expect(compiled2).toBe(cached2);
      expect(compiled1).not.toBe(compiled2);
    });

    test("should validate required parameters", ({ cache, analyzer }) => {
      // Assert - componentId validation
      expect(() =>
        cache.getOrCompile(null as any, "<div></div>", analyzer),
      ).toThrow("ComponentId is required");
      expect(() =>
        cache.getOrCompile(undefined as any, "<div></div>", analyzer),
      ).toThrow("ComponentId is required");
      expect(() => cache.getOrCompile("", "<div></div>", analyzer)).toThrow(
        "ComponentId is required",
      );

      // Assert - template validation
      expect(() =>
        cache.getOrCompile("my-component", null as any, analyzer),
      ).toThrow("Template is required");
      expect(() =>
        cache.getOrCompile("my-component", undefined as any, analyzer),
      ).toThrow("Template is required");
      expect(() => cache.getOrCompile("my-component", "", analyzer)).toThrow(
        "Template is required",
      );

      // Assert - analyzer validation
      expect(() =>
        cache.getOrCompile("my-component", "<div></div>", null as any),
      ).toThrow("Analyzer is required");
      expect(() =>
        cache.getOrCompile("my-component", "<div></div>", undefined as any),
      ).toThrow("Analyzer is required");
    });

    test("should compile complex templates with multiple bindings", ({
      cache,
      analyzer,
    }) => {
      // Arrange
      const componentId = "complex-component";
      const template =
        '<div class="{{className}}"><h1>{{title}}</h1><p>{{description}}</p></div>';

      // Act
      const compiled = cache.getOrCompile(componentId, template, analyzer);

      // Assert
      expect(compiled.bindings.size).toBe(3);
      expect(compiled.bindings.has("className")).toBe(true);
      expect(compiled.bindings.has("title")).toBe(true);
      expect(compiled.bindings.has("description")).toBe(true);
    });

    test("should handle templates with nested property bindings", ({
      cache,
      analyzer,
    }) => {
      // Arrange
      const componentId = "nested-component";
      const template = "<div>{{user.profile.name}}</div>";

      // Act
      const compiled = cache.getOrCompile(componentId, template, analyzer);

      // Assert
      expect(compiled.bindings.size).toBe(1);
      expect(compiled.bindings.has("user.profile.name")).toBe(true);
    });
  });

  /**
   * Cache key strategy tests.
   * Validates that cache prevents staleness when same component has different resolved templates.
   * This is critical for static binding resolution - when [[Constants.X]] resolves differently,
   * cache should not collide.
   */
  test.describe("cache key strategy (staleness prevention)", () => {
    test("should use different cache entry for same component with different resolved templates", ({
      cache,
      analyzer,
    }) => {
      // ARRANGE
      // Scenario: component receives constants that change; [[Constants.VERSION]] resolves differently
      // Version 1: static binding [[Constants.VERSION]] resolved to "v1.0" by TemplateProvider
      const resolvedTemplate1 = "<div>v1.0 {{status}}</div>";
      // Version 2: same component but [[Constants.VERSION]] now resolved to "v2.0"
      const resolvedTemplate2 = "<div>v2.0 {{status}}</div>";

      // ACT
      const compiled1 = cache.getOrCompile(
        "version-display",
        resolvedTemplate1,
        analyzer,
      );
      const compiled2 = cache.getOrCompile(
        "version-display",
        resolvedTemplate2,
        analyzer,
      );

      // ASSERT - different resolved templates should NOT share cache entries
      expect(compiled1).not.toBe(compiled2);
      expect(compiled1.templateString).toBe(resolvedTemplate1);
      expect(compiled2.templateString).toBe(resolvedTemplate2);
      expect(cache.has("version-display", resolvedTemplate1)).toBe(true);
      expect(cache.has("version-display", resolvedTemplate2)).toBe(true);
    });

    test("should cache same resolved template consistently across multiple calls", ({
      cache,
      analyzer,
    }) => {
      // ARRANGE
      const resolvedTemplate = "<div>production {{feature}}</div>";

      // ACT - call multiple times with same resolved template
      const compiled1 = cache.getOrCompile(
        "feature-flag",
        resolvedTemplate,
        analyzer,
      );
      const compiled2 = cache.getOrCompile(
        "feature-flag",
        resolvedTemplate,
        analyzer,
      );
      const compiled3 = cache.getOrCompile(
        "feature-flag",
        resolvedTemplate,
        analyzer,
      );

      // ASSERT - all calls should return same cached instance
      expect(compiled1).toBe(compiled2);
      expect(compiled2).toBe(compiled3);
      expect(cache.has("feature-flag", resolvedTemplate)).toBe(true);
    });
  });

  /**
   * Cache existence check tests.
   * Validates has method for cache lookup.
   */
  test.describe("has()", () => {
    test("should return false when template not cached", ({ cache }) => {
      // Act
      const exists = cache.has("unknown-component", "<div></div>");

      // Assert
      expect(exists).toBe(false);
    });

    test("should return true after caching template", ({ cache, analyzer }) => {
      // Arrange
      const componentId = "my-component";
      const template = "<div></div>";
      cache.getOrCompile(componentId, template, analyzer);

      // Act
      const exists = cache.has(componentId, template);

      // Assert
      expect(exists).toBe(true);
    });

    test("should return true for multiple cached templates", ({
      cache,
      analyzer,
    }) => {
      // Arrange
      const template1 = "<div></div>";
      const template2 = "<span></span>";
      const template3 = "<p></p>";

      cache.getOrCompile("component-a", template1, analyzer);
      cache.getOrCompile("component-b", template2, analyzer);
      cache.getOrCompile("component-c", template3, analyzer);

      // Act
      const existsA = cache.has("component-a", template1);
      const existsB = cache.has("component-b", template2);
      const existsC = cache.has("component-c", template3);
      const existsD = cache.has("component-d", "<article></article>");

      // Assert
      expect(existsA).toBe(true);
      expect(existsB).toBe(true);
      expect(existsC).toBe(true);
      expect(existsD).toBe(false);
    });

    test("should validate required parameters", ({ cache }) => {
      // Assert - componentId validation
      expect(() => cache.has(null as any, "<div></div>")).toThrow(
        "ComponentId is required",
      );
      expect(() => cache.has(undefined as any, "<div></div>")).toThrow(
        "ComponentId is required",
      );
      expect(() => cache.has("", "<div></div>")).toThrow(
        "ComponentId is required",
      );

      // Assert - template validation
      expect(() => cache.has("component", undefined as any)).toThrow(
        "Template is required",
      );
      expect(() => cache.has("component", "")).toThrow("Template is required");
    });
  });

  /**
   * Cache clearing tests.
   * Validates clear method for cache cleanup.
   */
  test.describe("clear()", () => {
    test("should remove all cached templates", ({ cache, analyzer }) => {
      // Arrange
      const template1 = "<div>a</div>";
      const template2 = "<div>b</div>";
      const template3 = "<div>c</div>";

      cache.getOrCompile("component-a", template1, analyzer);
      cache.getOrCompile("component-b", template2, analyzer);
      cache.getOrCompile("component-c", template3, analyzer);

      // Act
      cache.clear();

      // Assert
      expect(cache.has("component-a", template1)).toBe(false);
      expect(cache.has("component-b", template2)).toBe(false);
      expect(cache.has("component-c", template3)).toBe(false);
    });

    test("should allow caching after clear", ({ cache, analyzer }) => {
      // Arrange
      const componentId = "my-component";
      const template = "<div>{{count}}</div>";
      cache.getOrCompile(componentId, template, analyzer);
      cache.clear();

      // Act
      const compiled = cache.getOrCompile(componentId, template, analyzer);

      // Assert
      expect(compiled).toBeDefined();
      expect(cache.has(componentId, template)).toBe(true);
    });

    test("should be idempotent (safe to call multiple times)", ({
      cache,
      analyzer,
    }) => {
      // Arrange
      const template = "<div>a</div>";
      cache.getOrCompile("component-a", template, analyzer);

      // Act
      cache.clear();
      cache.clear();
      cache.clear();

      // Assert
      expect(cache.has("component-a", template)).toBe(false);
    });
  });
});
