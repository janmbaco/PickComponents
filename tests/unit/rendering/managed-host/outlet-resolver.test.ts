import { test, expect } from "@playwright/test";
import { OutletResolver } from "../../../../src/rendering/managed-host/outlet-resolver.js";
import { JSDOM } from "jsdom";

test.describe("OutletResolver", () => {
  let resolver: OutletResolver;
  let dom: JSDOM;
  let document: Document;

  test.beforeEach(() => {
    resolver = new OutletResolver();
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    (global as any).HTMLElement = dom.window.HTMLElement;
  });

  test.afterEach(() => {
    delete (global as any).HTMLElement;
  });

  test.describe("resolve", () => {
    test("should throw error if rootElement is null", () => {
      // Act & Assert
      expect(() => resolver.resolve(null as any)).toThrow(
        "Root element is required",
      );
    });

    test("should throw error if rootElement is undefined", () => {
      // Act & Assert
      expect(() => resolver.resolve(undefined as any)).toThrow(
        "Root element is required",
      );
    });

    test("should return explicit .outlet element when present", () => {
      // Arrange
      const root = document.createElement("div");
      const outlet = document.createElement("span");
      outlet.className = "outlet";
      const other = document.createElement("p");
      root.appendChild(other);
      root.appendChild(outlet);

      // Act
      const result = resolver.resolve(root);

      // Assert
      expect(result).toBe(outlet);
    });

    test("should return first child when root has single child element", () => {
      // Arrange
      const root = document.createElement("div");
      const child = document.createElement("span");
      root.appendChild(child);

      // Act
      const result = resolver.resolve(root);

      // Assert
      expect(result).toBe(child);
    });

    test("should return root element when multiple children and no .outlet", () => {
      // Arrange
      const root = document.createElement("div");
      const child1 = document.createElement("span");
      const child2 = document.createElement("p");
      root.appendChild(child1);
      root.appendChild(child2);

      // Act
      const result = resolver.resolve(root);

      // Assert
      expect(result).toBe(root);
    });

    test("should return root element when no children", () => {
      // Arrange
      const root = document.createElement("div");

      // Act
      const result = resolver.resolve(root);

      // Assert
      expect(result).toBe(root);
    });

    test("should prefer .outlet over single child strategy", () => {
      // Arrange
      const root = document.createElement("div");
      const wrapper = document.createElement("div");
      const outlet = document.createElement("span");
      outlet.className = "outlet other-class";
      wrapper.appendChild(outlet);
      root.appendChild(wrapper);

      // Act
      const result = resolver.resolve(root);

      // Assert
      expect(result).toBe(outlet);
    });

    test("should ignore text nodes when counting children", () => {
      // Arrange
      const root = document.createElement("div");
      const child = document.createElement("span");
      root.appendChild(document.createTextNode("text"));
      root.appendChild(child);
      root.appendChild(document.createTextNode("more text"));

      // Act
      const result = resolver.resolve(root);

      // Assert
      expect(result).toBe(child);
    });
  });
});
