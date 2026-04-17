import { test, expect } from "@playwright/test";
import { TemplateProviderFactory } from "../../../../src/rendering/templates/template-provider.factory.js";

/**
 * Tests for TemplateProviderFactory responsibility.
 *
 * Covers:
 * - Factory method creation and dependency wiring
 * - Custom dependency injection
 * - Instance isolation on multiple calls
 */
test.describe("TemplateProviderFactory", () => {
  /**
   * Default factory method tests.
   * Validates createDefault factory method.
   */
  test.describe("createDefault()", () => {
    test("should create TemplateProvider with default dependencies", () => {
      // Act
      const provider = TemplateProviderFactory.createDefault();

      // Assert
      expect(provider).toBeDefined();
      expect(provider.getSource).toBeDefined();
      expect(typeof provider.getSource).toBe("function");
    });

    test("should create independent instances on multiple calls", () => {
      // Act
      const provider1 = TemplateProviderFactory.createDefault();
      const provider2 = TemplateProviderFactory.createDefault();

      // Assert
      expect(provider1).not.toBe(provider2);
    });
  });

  /**
   * Custom dependency injection tests.
   * Validates createWithDependencies factory method with custom resolvers.
   */
  test.describe("createWithDependencies()", () => {
    test("should create TemplateProvider with custom dependencies", () => {
      // Arrange
      const mockRulesResolver = {
        resolve: () => ({ required: true }),
      };

      // Act
      const provider = TemplateProviderFactory.createWithDependencies(
        mockRulesResolver as any,
      );

      // Assert
      expect(provider).toBeDefined();
      expect(provider.getSource).toBeDefined();
    });
  });
});
