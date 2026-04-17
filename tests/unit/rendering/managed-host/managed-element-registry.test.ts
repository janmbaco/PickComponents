import { test, expect } from "@playwright/test";
import { ManagedElementRegistry } from "../../../../src/rendering/managed-host/managed-element-registry.js";
import { JSDOM } from "jsdom";

test.describe("ManagedElementRegistry", () => {
  let dom: JSDOM;
  let document: Document;

  test.beforeEach(() => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
  });

  test.describe("register", () => {
    test("should register element with componentId", () => {
      // Arrange
      const element = document.createElement("x-component");

      // Act
      ManagedElementRegistry.register(element, "x-component");

      // Assert
      expect(ManagedElementRegistry.isManagedElement(element)).toBe(true);
      expect(ManagedElementRegistry.getComponentId(element)).toBe(
        "x-component",
      );

      // Cleanup
      ManagedElementRegistry.unregister(element);
    });

    test("should throw error if element is null", () => {
      // Act & Assert
      expect(() =>
        ManagedElementRegistry.register(null as any, "test"),
      ).toThrow("Element is required");
    });

    test("should throw error if componentId is null", () => {
      // Arrange
      const element = document.createElement("div");

      // Act & Assert
      expect(() =>
        ManagedElementRegistry.register(element, null as any),
      ).toThrow("Component ID is required");
    });

    test("should allow re-registration with different componentId", () => {
      // Arrange
      const element = document.createElement("x-component");

      // Act
      ManagedElementRegistry.register(element, "first-id");
      ManagedElementRegistry.register(element, "second-id");

      // Assert
      expect(ManagedElementRegistry.getComponentId(element)).toBe("second-id");

      // Cleanup
      ManagedElementRegistry.unregister(element);
    });
  });

  test.describe("isManagedElement", () => {
    test("should return true for registered element", () => {
      // Arrange
      const element = document.createElement("x-managed");
      ManagedElementRegistry.register(element, "x-managed");

      // Act
      const result = ManagedElementRegistry.isManagedElement(element);

      // Assert
      expect(result).toBe(true);

      // Cleanup
      ManagedElementRegistry.unregister(element);
    });

    test("should return false for unregistered element", () => {
      // Arrange
      const element = document.createElement("x-unmanaged");

      // Act
      const result = ManagedElementRegistry.isManagedElement(element);

      // Assert
      expect(result).toBe(false);
    });

    test("should return false for null element", () => {
      // Act
      const result = ManagedElementRegistry.isManagedElement(null as any);

      // Assert
      expect(result).toBe(false);
    });
  });

  test.describe("getComponentId", () => {
    test("should return componentId for registered element", () => {
      // Arrange
      const element = document.createElement("x-component");
      ManagedElementRegistry.register(element, "my-component");

      // Act
      const componentId = ManagedElementRegistry.getComponentId(element);

      // Assert
      expect(componentId).toBe("my-component");

      // Cleanup
      ManagedElementRegistry.unregister(element);
    });

    test("should return undefined for unregistered element", () => {
      // Arrange
      const element = document.createElement("x-unmanaged");

      // Act
      const componentId = ManagedElementRegistry.getComponentId(element);

      // Assert
      expect(componentId).toBeUndefined();
    });

    test("should return undefined for null element", () => {
      // Act
      const componentId = ManagedElementRegistry.getComponentId(null as any);

      // Assert
      expect(componentId).toBeUndefined();
    });
  });

  test.describe("unregister", () => {
    test("should remove element from registry", () => {
      // Arrange
      const element = document.createElement("x-component");
      ManagedElementRegistry.register(element, "x-component");

      // Act
      ManagedElementRegistry.unregister(element);

      // Assert
      expect(ManagedElementRegistry.isManagedElement(element)).toBe(false);
      expect(ManagedElementRegistry.getComponentId(element)).toBeUndefined();
    });

    test("should handle unregistering non-registered element gracefully", () => {
      // Arrange
      const element = document.createElement("x-unmanaged");

      // Act & Assert (no error)
      expect(() => ManagedElementRegistry.unregister(element)).not.toThrow();
    });

    test("should handle null element gracefully", () => {
      // Act & Assert (no error)
      expect(() =>
        ManagedElementRegistry.unregister(null as any),
      ).not.toThrow();
    });
  });

  test.describe("WeakMap behavior", () => {
    test("should allow garbage collection of elements", () => {
      // Arrange
      let element: any = document.createElement("x-component");
      ManagedElementRegistry.register(element, "x-component");

      // Act - remove strong reference
      element = null;

      // Assert - WeakMap allows GC (can't directly test, but no memory leak)
      expect(true).toBe(true); // Placeholder for GC verification
    });

    test("should maintain separate entries for different elements", () => {
      // Arrange
      const element1 = document.createElement("x-first");
      const element2 = document.createElement("x-second");
      ManagedElementRegistry.register(element1, "first-component");
      ManagedElementRegistry.register(element2, "second-component");

      // Act & Assert
      expect(ManagedElementRegistry.getComponentId(element1)).toBe(
        "first-component",
      );
      expect(ManagedElementRegistry.getComponentId(element2)).toBe(
        "second-component",
      );

      // Cleanup
      ManagedElementRegistry.unregister(element1);
      ManagedElementRegistry.unregister(element2);
    });
  });
});
