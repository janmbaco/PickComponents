import { test as base, expect } from "@playwright/test";
import { ErrorRenderer } from "../../../../src/rendering/pipeline/error-renderer.js";
import { TemplateMother } from "../../../fixtures/template.mother.js";
import {
  IDomContext,
  DomContentType,
} from "../../../../src/rendering/dom-context/dom-context.interface.js";
import type { ErrorRenderOptions } from "../../../../src/rendering/pipeline/error-renderer.js";

/**
 * Fixture for ErrorRenderer tests.
 * Provides isolated instances of ErrorRenderer and mock dependencies.
 */
type ErrorRendererFixture = {
  renderer: ErrorRenderer;
  domAdapter: any;
  domContext: MockDomContext;
};

/**
 * Extended Playwright test with ErrorRenderer fixtures.
 */
const test = base.extend<ErrorRendererFixture>({
  domAdapter: async ({}, use: (r: any) => Promise<void>) => {
    const adapter = TemplateMother.createMockDomAdapter();
    await use(adapter);
  },

  renderer: async ({ domAdapter }, use) => {
    const renderer = new ErrorRenderer(
      domAdapter,
      TemplateMother.createExpressionResolver(),
    );
    await use(renderer);
  },

  domContext: async ({ domAdapter }, use) => {
    const context = new MockDomContext(domAdapter);
    await use(context);
  },
});

/**
 * Tests for ErrorRenderer responsibility.
 *
 * Covers:
 * - Constructor validation
 * - Default error overlay rendering
 * - Custom error template rendering
 * - Static binding preprocessing
 * - Message placeholder replacement
 * - Error handling and validation
 */
test.describe("ErrorRenderer", () => {
  /**
   * Constructor validation tests.
   * Validates dependency injection requirements.
   */
  test.describe("constructor", () => {
    test("should create instance with valid domAdapter", ({ renderer }) => {
      // Arrange
      // (renderer from fixture)

      // Assert
      expect(renderer).toBeDefined();
      expect(renderer.render).toBeDefined();
    });

    test("should throw error when domAdapter is null", () => {
      // Arrange
      const nullAdapter = null as any;

      // Act & Assert
      expect(
        () => new ErrorRenderer(nullAdapter, TemplateMother.createExpressionResolver()),
      ).toThrow("Dom adapter is required");
    });

    test("should throw error when domAdapter is undefined", () => {
      // Arrange
      const undefinedAdapter = undefined as any;

      // Act & Assert
      expect(
        () =>
          new ErrorRenderer(
            undefinedAdapter,
            TemplateMother.createExpressionResolver(),
          ),
      ).toThrow("Dom adapter is required");
    });

    test("should throw error when expressionResolver is undefined", () => {
      const domAdapter = TemplateMother.createMockDomAdapter();

      expect(() => new ErrorRenderer(domAdapter, undefined as any)).toThrow(
        "Expression resolver is required",
      );
    });
  });

  /**
   * Error rendering tests.
   * Validates render method behavior with different scenarios.
   */
  test.describe("render()", () => {
    test("should throw error when domContext is null", async ({ renderer }) => {
      // Act & Assert
      await expect(
        renderer.render(null as any, "Error occurred"),
      ).rejects.toThrow("DOM context is required");
    });

    test("should throw error when domContext is undefined", async ({
      renderer,
      domAdapter: _domAdapter,
    }) => {
      // Arrange
      await expect(
        renderer.render(undefined as any, "Error occurred"),
      ).rejects.toThrow("DOM context is required");
    });

    test("should throw error when errorMessage is null", async ({
      renderer,
      domContext,
    }) => {
      // Act & Assert
      await expect(renderer.render(domContext, null as any)).rejects.toThrow(
        "Error message is required",
      );
    });

    test("should throw error when errorMessage is undefined", async ({
      renderer,
      domContext,
    }) => {
      // Act & Assert
      await expect(
        renderer.render(domContext, undefined as any),
      ).rejects.toThrow("Error message is required");
    });

    test("should throw error when errorMessage is empty string", async ({
      renderer,
      domContext,
    }) => {
      // Act & Assert
      await expect(renderer.render(domContext, "")).rejects.toThrow(
        "Error message is required",
      );
    });

    test("should render default error overlay without options", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const errorMessage = "Component rendering failed";

      // Act
      await renderer.render(domContext, errorMessage);

      // Assert
      expect(domContext.element).toBeDefined();
      expect(domContext.element?.getAttribute("data-error")).toBe("true");
      expect(domContext.element?.innerHTML).toContain("⚠️");
      expect(domContext.element?.innerHTML).toContain(errorMessage);
      expect(domContext.contentType).toBe(DomContentType.ERROR);
    });

    test("should render default error overlay when options is empty", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const errorMessage = "Render error";
      const options: ErrorRenderOptions = {};

      // Act
      await renderer.render(domContext, errorMessage, options);

      // Assert
      expect(domContext.element).toBeDefined();
      expect(domContext.element?.getAttribute("data-error")).toBe("true");
      expect(domContext.element?.innerHTML).toContain("⚠️");
      expect(domContext.element?.innerHTML).toContain(errorMessage);
    });

    test("should render custom error template with message placeholder", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const errorMessage = "Custom error occurred";
      const options: ErrorRenderOptions = {
        errorTemplate: '<div class="custom-error">{{message}}</div>',
      };

      // Act
      await renderer.render(domContext, errorMessage, options);

      // Assert
      expect(domContext.element).toBeDefined();
      expect(domContext.element?.getAttribute("data-error")).toBe("true");
      expect(domContext.element?.innerHTML).toContain("custom-error");
      expect(domContext.element?.innerHTML).toContain(errorMessage);
      expect(domContext.element?.innerHTML).not.toContain("{{message}}");
    });

    test("should handle message placeholder with spaces", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const errorMessage = "Error with spaces";
      const options: ErrorRenderOptions = {
        errorTemplate: "<div>{{  message  }}</div>",
      };

      // Act
      await renderer.render(domContext, errorMessage, options);

      // Assert
      expect(domContext.element?.innerHTML).toContain(errorMessage);
      expect(domContext.element?.innerHTML).not.toContain("{{");
    });

    test("should replace multiple message placeholders", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const errorMessage = "Multiple occurrences";
      const options: ErrorRenderOptions = {
        errorTemplate: "<div><h1>{{message}}</h1><p>{{message}}</p></div>",
      };

      // Act
      await renderer.render(domContext, errorMessage, options);

      // Assert
      const innerHTML = domContext.element?.innerHTML || "";
      const occurrences = (innerHTML.match(new RegExp(errorMessage, "g")) || [])
        .length;
      expect(occurrences).toBe(2);
    });

    test("should resolve component expressions in custom template", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const errorMessage = "Error with component state";
      const options: ErrorRenderOptions = {
        errorTemplate: '<div class="{{themeClass}}">{{message}}</div>',
        component: TemplateMother.createMockComponent({
          themeClass: "error-overlay",
        }),
      };

      // Act
      await renderer.render(domContext, errorMessage, options);

      // Assert
      expect(domContext.element?.innerHTML).toContain("error-overlay");
      expect(domContext.element?.innerHTML).toContain(errorMessage);
      expect(domContext.element?.innerHTML).not.toContain("{{themeClass}}");
    });

    test("should resolve nested component expressions in template", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const errorMessage = "Multiple expressions";
      const options: ErrorRenderOptions = {
        errorTemplate:
          '<div class="{{ui.container}}"><span class="{{ui.icon}}">{{message}}</span></div>',
        component: TemplateMother.createMockComponent({
          ui: {
            container: "error-container",
            icon: "error-icon",
          },
        }),
      };

      // Act
      await renderer.render(domContext, errorMessage, options);

      // Assert
      expect(domContext.element?.innerHTML).toContain("error-container");
      expect(domContext.element?.innerHTML).toContain("error-icon");
      expect(domContext.element?.innerHTML).not.toContain("{{ui.");
    });

    test("should render custom template without component context", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const errorMessage = "No component";
      const options: ErrorRenderOptions = {
        errorTemplate: '<div class="static-class">{{message}}</div>',
      };

      // Act
      await renderer.render(domContext, errorMessage, options);

      // Assert
      expect(domContext.element?.innerHTML).toContain("static-class");
      expect(domContext.element?.innerHTML).toContain(errorMessage);
    });

    test("should set data-error attribute on rendered element", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const errorMessage = "Error message";

      // Act
      await renderer.render(domContext, errorMessage);

      // Assert
      expect(domContext.element?.getAttribute("data-error")).toBe("true");
    });

    test("should set content type to ERROR in domContext", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const errorMessage = "Error message";

      // Act
      await renderer.render(domContext, errorMessage);

      // Assert
      expect(domContext.contentType).toBe(DomContentType.ERROR);
    });

    test("should handle complex HTML in custom template", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const errorMessage = "Complex error";
      const options: ErrorRenderOptions = {
        errorTemplate: `
          <div class="error-wrapper">
            <header>
              <h1>Error</h1>
            </header>
            <main>
              <p>{{message}}</p>
            </main>
            <footer>
              <button>Retry</button>
            </footer>
          </div>
        `,
      };

      // Act
      await renderer.render(domContext, errorMessage, options);

      // Assert
      expect(domContext.element?.innerHTML).toContain("error-wrapper");
      expect(domContext.element?.innerHTML).toContain(errorMessage);
      expect(domContext.element?.innerHTML).toContain("Retry");
    });

    test("should prevent XSS by escaping HTML in error message", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const errorMessage = '<script>alert("xss")</script>';

      // Act
      await renderer.render(domContext, errorMessage);

      // Assert
      const innerHTML = domContext.element?.innerHTML || "";
      // Script should be escaped as text, not executable
      expect(innerHTML).toContain("&lt;script&gt;");
      expect(domContext.element?.querySelector("script")).toBeNull();
    });

    test("should handle special characters in error message", async ({
      renderer,
      domContext,
    }) => {
      // Arrange
      const errorMessage = 'Error: "Component" failed & couldn\'t render';
      const options: ErrorRenderOptions = {
        errorTemplate: "<div>{{message}}</div>",
      };

      // Act
      await renderer.render(domContext, errorMessage, options);

      // Assert
      expect(domContext.element?.innerHTML).toContain("Component");
      expect(domContext.element?.innerHTML).toContain("failed");
    });
  });
});

/**
 * Mock DomContext for testing ErrorRenderer.
 * Tracks setElement calls and stores the rendered element.
 */
class MockDomContext implements IDomContext {
  contextId: string = "mock-context-123";
  element: HTMLElement | null = null;
  contentType: DomContentType | null = null;
  private targetRoot: HTMLElement;
  private isRendered: boolean = false;

  constructor(domAdapter: any) {
    this.targetRoot = domAdapter.createElement("div");
  }

  setElement(element: HTMLElement, contentType: DomContentType): void {
    this.element = element;
    this.contentType = contentType;
    this.isRendered = true;
  }

  getElement(): HTMLElement | null {
    return this.element;
  }

  getTargetRoot(): HTMLElement | ShadowRoot {
    return this.targetRoot;
  }

  getIsRendered(): boolean {
    return this.isRendered;
  }

  getContentType(): DomContentType {
    return this.contentType || DomContentType.COMPONENT;
  }

  addSubscription(_subscription: any): void {
    // No-op for tests
  }

  query(selector: string): HTMLElement | null {
    if (!this.element) return null;
    return this.element.querySelector(selector);
  }

  clearSubscriptions(): void {
    // No-op for tests
  }

  clear(): void {
    this.element = null;
    this.contentType = null;
    this.isRendered = false;
  }

  destroy(): void {
    this.clear();
  }
}
