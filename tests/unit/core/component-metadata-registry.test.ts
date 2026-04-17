import { test, expect } from "@playwright/test";
import { ComponentMetadataRegistry } from "../../../src/core/component-metadata-registry.js";
import { ComponentMetadata } from "../../../src/core/component-metadata.js";

test.describe("ComponentMetadataRegistry", () => {
  let registry: ComponentMetadataRegistry;

  test.beforeEach(() => {
    registry = new ComponentMetadataRegistry();
  });

  test.describe("register()", () => {
    test("should register component metadata", () => {
      // ARRANGE
      const metadata: ComponentMetadata = {
        selector: "test-component",
        template: "<div>Test</div>",
      };

      // ACT
      registry.register("test-component", metadata);

      // ASSERT
      expect(registry.has("test-component")).toBe(true);
    });

    test("should throw if componentId is null", () => {
      // ARRANGE
      const metadata: ComponentMetadata = {
        selector: "test",
        template: "<div></div>",
      };

      // ACT & ASSERT
      expect(() => registry.register(null as any, metadata)).toThrow(
        "ComponentId is required",
      );
    });

    test("should throw if metadata is null", () => {
      // ACT & ASSERT
      expect(() => registry.register("test", null as any)).toThrow(
        "Metadata is required",
      );
    });

    test("should throw if componentId is already registered", () => {
      // ARRANGE
      const metadata: ComponentMetadata = {
        selector: "test",
        template: "<div></div>",
      };
      registry.register("test", metadata);

      // ACT & ASSERT
      expect(() => registry.register("test", metadata)).toThrow(
        "Component test is already registered",
      );
    });
  });

  test.describe("get()", () => {
    test("should retrieve registered metadata", () => {
      // ARRANGE
      const metadata: ComponentMetadata = {
        selector: "test-component",
        template: "<div>Test</div>",
        styles: ".container { color: red; }",
      };
      registry.register("test-component", metadata);

      // ACT
      const result = registry.get("test-component");

      // ASSERT
      expect(result).toBe(metadata);
      expect(result?.template).toBe("<div>Test</div>");
      expect(result?.styles).toBe(".container { color: red; }");
    });

    test("should return undefined for non-existent component", () => {
      // ACT
      const result = registry.get("non-existent");

      // ASSERT
      expect(result).toBeUndefined();
    });

    test("should throw if componentId is null", () => {
      // ACT & ASSERT
      expect(() => registry.get(null as any)).toThrow(
        "ComponentId is required",
      );
    });
  });

  test.describe("has()", () => {
    test("should return true for registered component", () => {
      // ARRANGE
      const metadata: ComponentMetadata = {
        selector: "test",
        template: "<div></div>",
      };
      registry.register("test", metadata);

      // ACT & ASSERT
      expect(registry.has("test")).toBe(true);
    });

    test("should return false for non-registered component", () => {
      // ACT & ASSERT
      expect(registry.has("non-existent")).toBe(false);
    });

    test("should throw if componentId is null", () => {
      // ACT & ASSERT
      expect(() => registry.has(null as any)).toThrow(
        "ComponentId is required",
      );
    });
  });

  test.describe("clear()", () => {
    test("should clear all registered metadata", () => {
      // ARRANGE
      const metadata1: ComponentMetadata = {
        selector: "test1",
        template: "<div></div>",
      };
      const metadata2: ComponentMetadata = {
        selector: "test2",
        template: "<div></div>",
      };
      registry.register("test1", metadata1);
      registry.register("test2", metadata2);

      // ACT
      registry.clear();

      // ASSERT
      expect(registry.has("test1")).toBe(false);
      expect(registry.has("test2")).toBe(false);
    });

    test("should allow re-registration after clear", () => {
      // ARRANGE
      const metadata: ComponentMetadata = {
        selector: "test",
        template: "<div></div>",
      };
      registry.register("test", metadata);
      registry.clear();

      // ACT & ASSERT
      expect(() => registry.register("test", metadata)).not.toThrow();
    });
  });
});
