import { test, expect } from "@playwright/test";
import { bootstrapFramework } from "../../../src/providers/framework-bootstrap.js";

/**
 * Tests for bootstrapFramework responsibility.
 *
 * Covers:
 * - Guard clause validation
 * - All framework services are registered
 * - Idempotent behavior (multiple calls do not re-register)
 * - Override support (developer overrides replace framework defaults)
 */
test.describe("bootstrapFramework", () => {
  /**
   * Creates a mock service registry that tracks registrations.
   */
  function createMockServiceRegistry(): {
    registry: Record<string, unknown>;
    has: (token: string | symbol | Function) => boolean;
    get: <T>(token: string | symbol | Function) => T;
    register: (token: string | symbol | Function, factory: unknown) => void;
    clear: () => void;
  } {
    const registry: Record<string, unknown> = {};

    return {
      registry,
      has(token: string | symbol | Function): boolean {
        const key = String(token);
        return key in registry;
      },
      get<T>(token: string | symbol | Function): T {
        const key = String(token);
        const factory = registry[key];
        if (!factory) throw new Error(`Service not found: ${key}`);
        if (typeof factory === "function") return (factory as () => T)();
        return factory as T;
      },
      register(
        token: string | symbol | Function,
        instanceOrFactory: unknown,
      ): void {
        const key = String(token);
        registry[key] = instanceOrFactory;
      },
      clear(): void {
        for (const key of Object.keys(registry)) {
          delete registry[key];
        }
      },
    };
  }

  test("should throw error when registry is null", async () => {
    // Act & Assert
    await expect(bootstrapFramework(null as any)).rejects.toThrow(
      "Service registry is required",
    );
  });

  test("should throw error when registry is undefined", async () => {
    // Act & Assert
    await expect(bootstrapFramework(undefined as any)).rejects.toThrow(
      "Service registry is required",
    );
  });

  test("should register core framework services", async () => {
    // Arrange
    const mock = createMockServiceRegistry();

    // Act
    await bootstrapFramework(mock as any);

    // Assert
    const expectedTokens = [
      "IDecoratorMode",
      "IDomAdapter",
      "ISkeletonValidator",
      "ISkeletonRenderer",
      "IComponentMetadataRegistry",
      "IComponentInstanceRegistry",
      "IHostResolver",
      "IExpressionParser",
      "IEvaluator",
      "IExpressionResolver",
      "IPropertyExtractor",
      "IManagedElementRegistry",
      "IManagedElementResolver",
      "IOutletResolver",
      "IHostStyleMigrator",
      "ITransparentHostFactory",
      "IBindingResolver",
      "IErrorRenderer",
      "ITemplateCompiler",
      "ITemplateAnalyzer",
      "ITemplateCompilationCache",
      "IRenderPipeline",
      "IDomContextFactory",
      "ITemplateProvider",
      "IRenderEngine",
      "IPickComponentFactory",
      "IListenerMetadataRegistry",
      "IListenerInitializer",
      "IPickElementFactory",
      "IPickElementRegistrar",
    ];

    for (const token of expectedTokens) {
      expect(mock.has(token)).toBe(true);
    }
  });

  test("should default decorator compatibility mode to auto", async () => {
    // Arrange
    const mock = createMockServiceRegistry();

    // Act
    await bootstrapFramework(mock as any);

    // Assert
    expect(mock.get("IDecoratorMode")).toBe("auto");
  });

  test("should allow strict decorator compatibility opt-in", async () => {
    // Arrange
    const mock = createMockServiceRegistry();

    // Act
    await bootstrapFramework(mock as any, {}, { decorators: "strict" });

    // Assert
    expect(mock.get("IDecoratorMode")).toBe("strict");
  });

  test("should not re-register services on subsequent calls", async () => {
    // Arrange
    const mock = createMockServiceRegistry();
    await bootstrapFramework(mock as any);
    const firstRegistrations = { ...mock.registry };

    // Act
    await bootstrapFramework(mock as any);

    // Assert
    expect(mock.registry).toEqual(firstRegistrations);
  });

  test("should not overwrite pre-existing registrations", async () => {
    // Arrange
    const mock = createMockServiceRegistry();
    const customAdapter = { custom: true };
    mock.register("IDomAdapter", () => customAdapter);

    // Act
    await bootstrapFramework(mock as any);

    // Assert
    expect(mock.get("IDomAdapter")).toBe(customAdapter);
  });

  test("should apply overrides instead of defaults", async () => {
    // Arrange
    const mock = createMockServiceRegistry();
    const customAdapter = { overridden: true };

    // Act
    await bootstrapFramework(mock as any, {
      IDomAdapter: () => customAdapter,
    });

    // Assert
    expect(mock.get("IDomAdapter")).toBe(customAdapter);
  });

  test("should allow instance overrides", async () => {
    // Arrange
    const mock = createMockServiceRegistry();
    const singletonAdapter = { singleton: true };

    // Act
    await bootstrapFramework(mock as any, {
      IDomAdapter: singletonAdapter,
    });

    // Assert
    expect(mock.get("IDomAdapter")).toBe(singletonAdapter);
  });
});
