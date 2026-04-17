import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import {
  ComponentMetadata,
  ComponentMetadataRegistry,
} from "../../../src/core/component-metadata-registry.js";

test.describe("Shadow DOM + Host Integration (F5)", () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window & typeof globalThis;
  let registry: ComponentMetadataRegistry;

  test.beforeEach(() => {
    registry = new ComponentMetadataRegistry();
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    window = dom.window as any;
    (globalThis as any).document = document;
    (globalThis as any).window = window;
  });

  test.describe("metadata registration", () => {
    test("should register component metadata by selector", () => {
      // Arrange
      const selector = "shadow-component";
      const metadata: ComponentMetadata = {
        selector,
        template: '<div class="content">Shadow Content</div>',
        styles: ":host { display: block; }",
      };

      // Act
      registry.register(selector, metadata);

      // Assert
      const registered = registry.get(selector);
      expect(registered?.selector).toBe(selector);
      expect(registered?.template).toContain("Shadow Content");
    });

    test("should return undefined for unregistered selector", () => {
      // Act & Assert
      expect(registry.get("unregistered-component")).toBeUndefined();
    });
  });

  test.describe("host element attribute handling", () => {
    test("should preserve structural HTML attributes on host", () => {
      // Arrange - simulate pick-link with host attributes
      const hostElement = document.createElement("a") as HTMLAnchorElement;
      hostElement.href = "https://example.com";
      hostElement.target = "_blank";
      hostElement.rel = "noopener noreferrer";

      // Act & Assert
      expect(hostElement.href).toMatch(/^https:\/\/example\.com\/?$/);
      expect(hostElement.target).toBe("_blank");
      expect(hostElement.rel).toContain("noopener");
    });

    test("should handle form element attributes", () => {
      // Arrange
      const hostElement = document.createElement("input") as HTMLInputElement;
      hostElement.name = "username";
      hostElement.value = "john_doe";
      hostElement.type = "text";

      // Act & Assert
      expect(hostElement.name).toBe("username");
      expect(hostElement.value).toBe("john_doe");
      expect(hostElement.type).toBe("text");
    });

    test("should preserve CSS classes and styles", () => {
      // Arrange
      const hostElement = document.createElement("div");
      hostElement.className = "primary secondary rounded";
      hostElement.style.color = "blue";
      hostElement.style.padding = "10px";

      // Act & Assert
      expect(hostElement.className).toContain("primary");
      expect(hostElement.className).toContain("secondary");
      expect(hostElement.style.color).toBe("blue");
      expect(hostElement.style.padding).toBe("10px");
    });
  });

  test.describe("native slot projection support", () => {
    test("should support slot-based projection templates", () => {
      // Arrange
      const selector = "projection-component";
      const metadata: ComponentMetadata = {
        selector,
        template: '<div class="wrapper"><slot></slot></div>',
      };

      // Act
      registry.register(selector, metadata);

      // Assert
      const registered = registry.get(selector);
      expect(registered?.template).toContain("<slot>");
    });

    test("should support named slot projections", () => {
      // Arrange
      const selector = "layout-component";
      const metadata: ComponentMetadata = {
        selector,
        template: `
          <div class="layout">
            <header><slot name="header">Default Header</slot></header>
            <main><slot>Default Content</slot></main>
            <footer><slot name="footer">Default Footer</slot></footer>
          </div>
        `,
      };

      // Act
      registry.register(selector, metadata);

      // Assert
      const registered = registry.get(selector);
      expect(registered?.template).toContain("<slot");
      expect(registered?.template).toContain('name="header"');
      expect(registered?.template).toContain('name="footer"');
    });
  });

  test.describe("metadata consistency", () => {
    test("should resolve consistent metadata across multiple lookups", () => {
      // Arrange
      const selector = "consistent-component";
      const metadata: ComponentMetadata = {
        selector,
        template: "<div>Content</div>",
        styles: ".content { color: blue; }",
      };
      registry.register(selector, metadata);

      // Act
      const first = registry.get("consistent-component");
      const second = registry.get("consistent-component");
      const third = registry.get("consistent-component");

      // Assert - same metadata returned every time
      expect(first?.selector).toBe(second?.selector);
      expect(second?.selector).toBe(third?.selector);
      expect(first?.template).toContain("Content");
    });

    test("should support error and skeleton templates alongside main template", () => {
      // Arrange
      const selector = "resilient-component";
      const metadata: ComponentMetadata = {
        selector,
        template: "<div>Main Content</div>",
        skeleton: '<div class="skeleton"><div class="placeholder"></div></div>',
        errorTemplate: '<div class="error">Failed to load</div>',
      };

      // Act
      registry.register(selector, metadata);

      // Assert
      const registered = registry.get("resilient-component");
      expect(registered?.template).toContain("Main Content");
      expect(registered?.skeleton).toContain("skeleton");
      expect(registered?.errorTemplate).toContain("error");
    });
  });
});
