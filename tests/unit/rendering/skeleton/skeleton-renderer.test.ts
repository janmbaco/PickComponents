import { test as base, expect } from "@playwright/test";
import { SkeletonRenderer } from "../../../../src/rendering/skeleton/skeleton-renderer.js";
import { TemplateMother } from "../../../fixtures/template.mother.js";
import { MockSkeletonValidator } from "../../../fixtures/mock-skeleton-validator.js";
import { SkeletonRendererMother } from "../../../fixtures/skeleton-renderer.mother.js";
import { DomContentType } from "../../../../src/rendering/dom-context/dom-context.interface.js";
import { PickComponent } from "../../../../src/core/pick-component.js";
import type { ComponentMetadata } from "../../../../src/core/component-metadata.js";
import type { IDomAdapter } from "../../../../src/rendering/dom/dom-adapter.interface.js";
import { MockDomContext } from "../../../fixtures/mock-dom-context.js";

/**
 * Fixture for SkeletonRenderer tests.
 * Provides isolated instances of SkeletonRenderer and mock dependencies.
 */
type SkeletonRendererFixture = {
  renderer: SkeletonRenderer;
  domAdapter: IDomAdapter;
  domContext: MockDomContext;
};

/**
 * Extended Playwright test with SkeletonRenderer fixtures.
 */
const test = base.extend<SkeletonRendererFixture>({
  domAdapter: async ({}, use: (adapter: IDomAdapter) => Promise<void>) => {
    const adapter = TemplateMother.createMockDomAdapter();
    await use(adapter);
  },

  renderer: async ({ domAdapter }, use) => {
    const renderer = SkeletonRendererMother.create(domAdapter);
    await use(renderer);
  },

  domContext: async ({}, use) => {
    const context = new MockDomContext();
    await use(context);
  },
});

/**
 * Tests for SkeletonRenderer responsibility.
 *
 * Covers:
 * - Constructor validation
 * - Parameter validation
 * - Metadata skeleton rendering
 * - Default skeleton rendering
 * - Rendering priority rules
 */
test.describe("SkeletonRenderer", () => {
  test.describe("constructor", () => {
    test("should create instance with valid domAdapter", ({ renderer }) => {
      // Arrange
      // renderer provided by fixture

      // Assert
      expect(renderer).toBeDefined();
      expect(renderer.render).toBeDefined();
    });

    test("should throw error when domAdapter is null", () => {
      // Arrange
      const nullAdapter = null as any;

      // Act & Assert
      expect(
        () =>
          new SkeletonRenderer(
            nullAdapter,
            new MockSkeletonValidator(),
            TemplateMother.createExpressionResolver(),
          ),
      ).toThrow("Dom adapter is required");
    });

    test("should throw error when domAdapter is undefined", () => {
      // Arrange
      const undefinedAdapter = undefined as any;

      // Act & Assert
      expect(
        () =>
          new SkeletonRenderer(
            undefinedAdapter,
            new MockSkeletonValidator(),
            TemplateMother.createExpressionResolver(),
          ),
      ).toThrow("Dom adapter is required");
    });

    test("should throw error when expression resolver is missing", () => {
      const domAdapter = TemplateMother.createMockDomAdapter();

      expect(
        () =>
          new SkeletonRenderer(
            domAdapter,
            new MockSkeletonValidator(),
            null as any,
          ),
      ).toThrow("Expression resolver is required");
    });
  });

  test.describe("render()", () => {
    test("should invoke validator for metadata skeleton (DI behavior)", async ({
      domAdapter,
    }) => {
      // Arrange
      const validator = new MockSkeletonValidator();
      const renderer = SkeletonRendererMother.withValidator(
        domAdapter,
        validator,
      );
      const component = new TestComponent();
      const metadata = createMetadata('<div class="ok">Ok</div>');
      const ctx = new MockDomContext();

      // Act
      await renderer.render(component, metadata, ctx);

      // Assert
      expect(validator.calls).toBe(1);
    });

    test("should propagate validation error from validator", async ({
      domAdapter,
    }) => {
      // Arrange
      const renderer = SkeletonRendererMother.withValidator(
        domAdapter,
        new MockSkeletonValidator("Invalid skeleton"),
      );
      const component = new TestComponent();
      const metadata = createMetadata('<div class="bad">Bad</div>');
      const ctx = new MockDomContext();

      // Act & Assert
      await expect(renderer.render(component, metadata, ctx)).rejects.toThrow(
        "Invalid skeleton",
      );
    });
    test("should throw error when component is null", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const metadata = createMetadata();

      // Act & Assert
      await expect(
        renderer.render(null as any, metadata, domContext),
      ).rejects.toThrow("Component is required");
    });

    test("should throw error when metadata is null", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const component = new TestComponent();

      // Act & Assert
      await expect(
        renderer.render(component, null as any, domContext),
      ).rejects.toThrow("Metadata is required");
    });

    test("should throw error when domContext is null", async ({ renderer }) => {
      // Arrange
      const component = new TestComponent();
      const metadata = createMetadata();

      // Act & Assert
      await expect(
        renderer.render(component, metadata, null as any),
      ).rejects.toThrow("DOM context is required");
    });

    test("should render metadata skeleton when present", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const component = new TestComponent();
      const metadataSkeleton = '<div class="meta-skeleton">Meta Loading</div>';
      const metadata = createMetadata(metadataSkeleton);

      // Act
      await renderer.render(component, metadata, domContext);

      // Assert
      const element = domContext.getElement();
      expect(element?.getAttribute("data-skeleton")).toBe("true");
      expect(element?.innerHTML).toContain("meta-skeleton");
      expect(domContext.getContentType()).toBe(DomContentType.SKELETON);
    });

    test("should render default skeleton when no custom or metadata skeleton", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const component = new TestComponent();
      const metadata = createMetadata();

      // Act
      await renderer.render(component, metadata, domContext);

      // Assert
      const element = domContext.getElement();
      expect(element?.getAttribute("data-skeleton")).toBe("true");
      expect(element?.innerHTML).toContain("pick-default-skeleton");
      expect(element?.innerHTML).toContain("pick-skeleton-dot");
      expect(domContext.getContentType()).toBe(DomContentType.SKELETON);
    });

    test("should set data-skeleton attribute on rendered wrapper", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const component = new TestComponent();
      const metadata = createMetadata("<div>Meta</div>");

      // Act
      await renderer.render(component, metadata, domContext);

      // Assert
      expect(domContext.getElement()?.getAttribute("data-skeleton")).toBe(
        "true",
      );
    });

    test("should resolve component expressions in metadata skeleton", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const component = new TestComponent();
      component.t = { LOADING: "Cargando…" };
      const metadata = createMetadata('<p aria-busy="true">{{t.LOADING}}</p>');

      // Act
      await renderer.render(component, metadata, domContext);

      // Assert
      const html = domContext.getElement()?.innerHTML || "";
      expect(html).toContain("Cargando…");
      expect(html).not.toContain("{{t.LOADING}}");
    });

    test("should leave non-RULES [[...]] literals untouched in skeletons", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const component = new TestComponent();
      const metadata = createMetadata("<p>[[T.LOADING]]</p>");

      // Act
      await renderer.render(component, metadata, domContext);

      // Assert
      const html = domContext.getElement()?.innerHTML || "";
      expect(html).toContain("[[T.LOADING]]");
    });

    test("should render default skeleton structure with styles", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const component = new TestComponent();
      const metadata = createMetadata();

      // Act
      await renderer.render(component, metadata, domContext);

      // Assert
      const html = domContext.getElement()?.innerHTML || "";
      expect(html).toContain("pick-default-skeleton");
      expect(html).toContain("<style>");
    });

    test("should remove unsafe skeleton URL attributes through the shared policy", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const component = new TestComponent();
      const metadata = createMetadata(
        [
          '<a href="java script:alert(1)">bad link</a>',
          '<img src="data:text/html,<script>alert(1)</script>">',
          '<form action="VBScript:msgbox(1)"></form>',
        ].join(""),
      );

      // Act
      await renderer.render(component, metadata, domContext);

      // Assert
      const wrapper = domContext.getElement();
      expect(wrapper?.querySelector("a")?.hasAttribute("href")).toBe(false);
      expect(wrapper?.querySelector("img")?.hasAttribute("src")).toBe(false);
      expect(wrapper?.querySelector("form")?.hasAttribute("action")).toBe(
        false,
      );
    });
  });

  test.describe("performance & caching", () => {
    test("should cache default skeleton and reuse it", async ({
      domAdapter,
    }) => {
      // Arrange
      let createElementCallCount = 0;

      // Wrap createElement to count calls
      const originalCreateElement = domAdapter.createElement.bind(domAdapter);
      (domAdapter as any).createElement = (tagName: string) => {
        if (tagName === "div" || tagName === "style") {
          createElementCallCount++;
        }
        return originalCreateElement(tagName);
      };

      const renderer = SkeletonRendererMother.create(domAdapter);
      const component = new TestComponent();
      const metadata = createMetadata();

      // Act - First render (builds cache)
      const context1 = new MockDomContext();
      await renderer.render(component, metadata, context1);
      const firstRenderCallCount = createElementCallCount;

      // Second render (should reuse cache via cloneNode, minimal createElement calls)
      createElementCallCount = 0; // Reset counter
      const context2 = new MockDomContext();
      await renderer.render(component, metadata, context2);
      const secondRenderCallCount = createElementCallCount;

      // Assert
      // First render creates wrapper + structure (3 dots divs) + style = at least 5 createElement calls
      expect(firstRenderCallCount).toBeGreaterThan(0);
      // Second render should only create the wrapper div, cloneNode handles the rest
      expect(secondRenderCallCount).toBeLessThan(firstRenderCallCount);

      // Restore original
      (domAdapter as any).createElement = originalCreateElement;
    });

    test("should produce identical skeletons on multiple renders", async ({
      renderer,
    }) => {
      // Arrange
      const component = new TestComponent();
      const metadata = createMetadata();
      const contexts: MockDomContext[] = [];

      // Act - Render 3 times
      for (let i = 0; i < 3; i++) {
        const ctx = new MockDomContext();
        contexts.push(ctx);
        await renderer.render(component, metadata, ctx);
      }

      // Assert - All should have identical structure
      const html1 = contexts[0].getElement()?.innerHTML || "";
      const html2 = contexts[1].getElement()?.innerHTML || "";
      const html3 = contexts[2].getElement()?.innerHTML || "";

      expect(html1).toBe(html2);
      expect(html2).toBe(html3);
      expect(html1).toContain("pick-default-skeleton");
    });
  });
});

/**
 * Mock DomContext for testing SkeletonRenderer.
 * Tracks setElement calls and stores the rendered element.
 */
// Local MockDomContext removed; using shared fixture from tests/fixtures

/**
 * Test component instance.
 */
class TestComponent extends PickComponent {
  // No onRenderSkeleton; all skeleton config comes from metadata
  t?: Record<string, string>;
}

/**
 * Creates minimal ComponentMetadata for tests.
 *
 * @param skeleton - Optional skeleton HTML string
 * @returns ComponentMetadata object
 */
function createMetadata(skeleton?: string): ComponentMetadata {
  return {
    selector: "test-component",
    template: "<div></div>",
    skeleton,
  } as ComponentMetadata;
}
