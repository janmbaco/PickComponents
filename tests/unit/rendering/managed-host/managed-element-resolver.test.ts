import { test, expect } from "@playwright/test";
import { ManagedElementResolver } from "../../../../src/rendering/managed-host/managed-element-resolver.js";
import { ManagedElementRegistry } from "../../../../src/rendering/managed-host/managed-element-registry.js";
import { JSDOM } from "jsdom";

test.describe("ManagedElementResolver", () => {
  let resolver: ManagedElementResolver;
  let dom: JSDOM;
  let document: Document;

  test.beforeEach(() => {
    resolver = new ManagedElementResolver(ManagedElementRegistry);
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
  });

  test.describe("isManagedElement", () => {
    test("should return true for registered element", () => {
      // Arrange
      const element = document.createElement("x-managed");
      ManagedElementRegistry.register(element, "x-managed");

      // Act
      const result = resolver.isManagedElement(element);

      // Assert
      expect(result).toBe(true);

      // Cleanup
      ManagedElementRegistry.unregister(element);
    });

    test("should return false for unregistered element", () => {
      // Arrange
      const element = document.createElement("x-unmanaged");

      // Act
      const result = resolver.isManagedElement(element);

      // Assert
      expect(result).toBe(false);
    });

    test("should return false for regular HTML element", () => {
      // Arrange
      const element = document.createElement("div");

      // Act
      const result = resolver.isManagedElement(element);

      // Assert
      expect(result).toBe(false);
    });

    test("should distinguish between managed and unmanaged custom elements", () => {
      // Arrange
      const managed = document.createElement("x-managed");
      const unmanaged = document.createElement("x-unmanaged");
      ManagedElementRegistry.register(managed, "x-managed");

      // Act & Assert
      expect(resolver.isManagedElement(managed)).toBe(true);
      expect(resolver.isManagedElement(unmanaged)).toBe(false);

      // Cleanup
      ManagedElementRegistry.unregister(managed);
    });

    test("should return false after element is unregistered", () => {
      // Arrange
      const element = document.createElement("x-managed");
      ManagedElementRegistry.register(element, "x-managed");

      // Act
      ManagedElementRegistry.unregister(element);
      const result = resolver.isManagedElement(element);

      // Assert
      expect(result).toBe(false);
    });
  });
});
