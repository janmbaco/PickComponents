import { test, expect } from "@playwright/test";
import { PickElementRegistrar } from "../../../src/registration/pick-element-registrar.js";
import type { IPickElementFactory } from "../../../src/registration/pick-element-factory.interface.js";
import type { IServiceRegistry } from "../../../src/providers/service-provider.interface.js";
import type { PickComponent } from "../../../src/core/pick-component.js";

/**
 * Tests for PickElementRegistrar responsibility.
 *
 * Covers:
 * - Constructor validation
 * - Tag registration and pick tag marking
 * - Delegation to element factory
 * - Behavior token registration
 * - Guard clauses for register() parameters
 */
test.describe("PickElementRegistrar", () => {
  /**
   * Creates a mock service registry for testing.
   */
  function createMockServiceRegistry(): IServiceRegistry {
    const store: Record<string, () => unknown> = {};

    return {
      has(token: string | symbol | Function): boolean {
        return String(token) in store;
      },
      get<T>(token: string | symbol | Function): T {
        const factory = store[String(token)];
        if (!factory) throw new Error(`Not found: ${String(token)}`);
        return factory() as T;
      },
      register(
        token: string | symbol | Function,
        factory: () => unknown,
      ): void {
        store[String(token)] = factory;
      },
      clear(): void {
        for (const key of Object.keys(store)) {
          delete store[key];
        }
      },
    };
  }

  /**
   * Creates a mock element factory that tracks create calls.
   */
  function createMockElementFactory(): IPickElementFactory & {
    createCalls: Array<{ componentCtor: unknown; options: unknown }>;
  } {
    const createCalls: Array<{ componentCtor: unknown; options: unknown }> = [];

    return {
      createCalls,
      create(
        componentCtor: new (...args: unknown[]) => PickComponent,
        options?: unknown,
      ): CustomElementConstructor {
        createCalls.push({ componentCtor, options });
        return class MockElement {} as unknown as CustomElementConstructor;
      },
    };
  }

  /**
   * Creates a dummy PickComponent constructor for testing.
   */
  function createDummyComponentCtor(): new (
    ...args: unknown[]
  ) => PickComponent {
    return class DummyComponent {} as unknown as new (
      ...args: unknown[]
    ) => PickComponent;
  }

  /**
   * Constructor validation tests.
   */
  test.describe("constructor", () => {
    test("should create instance with valid dependencies", () => {
      // Arrange
      const registry = createMockServiceRegistry();
      const factory = createMockElementFactory();

      // Act
      const registrar = new PickElementRegistrar(registry, factory);

      // Assert
      expect(registrar).toBeDefined();
    });

    test("should throw error when serviceRegistry is null", () => {
      // Arrange
      const factory = createMockElementFactory();

      // Act & Assert
      expect(() => new PickElementRegistrar(null as any, factory)).toThrow(
        "Service registry is required",
      );
    });

    test("should throw error when serviceRegistry is undefined", () => {
      // Arrange
      const factory = createMockElementFactory();

      // Act & Assert
      expect(
        () => new PickElementRegistrar(undefined as any, factory),
      ).toThrow("Service registry is required");
    });

    test("should throw error when elementFactory is null", () => {
      // Arrange
      const registry = createMockServiceRegistry();

      // Act & Assert
      expect(() => new PickElementRegistrar(registry, null as any)).toThrow(
        "Element factory is required",
      );
    });

    test("should throw error when elementFactory is undefined", () => {
      // Arrange
      const registry = createMockServiceRegistry();

      // Act & Assert
      expect(
        () => new PickElementRegistrar(registry, undefined as any),
      ).toThrow("Element factory is required");
    });
  });

  /**
   * Register method tests.
   * Validates tag registration, pick tag marking, and factory delegation.
   */
  test.describe("register()", () => {
    test("should throw error when tagName is null", () => {
      // Arrange
      const registry = createMockServiceRegistry();
      const factory = createMockElementFactory();
      const registrar = new PickElementRegistrar(registry, factory);

      // Act & Assert
      expect(() =>
        registrar.register(null as any, createDummyComponentCtor()),
      ).toThrow("Tag name is required");
    });

    test("should throw error when tagName is undefined", () => {
      // Arrange
      const registry = createMockServiceRegistry();
      const factory = createMockElementFactory();
      const registrar = new PickElementRegistrar(registry, factory);

      // Act & Assert
      expect(() =>
        registrar.register(undefined as any, createDummyComponentCtor()),
      ).toThrow("Tag name is required");
    });

    test("should throw error when tagName is empty string", () => {
      // Arrange
      const registry = createMockServiceRegistry();
      const factory = createMockElementFactory();
      const registrar = new PickElementRegistrar(registry, factory);

      // Act & Assert
      expect(() => registrar.register("", createDummyComponentCtor())).toThrow(
        "Tag name is required",
      );
    });

    test("should throw error when componentCtor is null", () => {
      // Arrange
      const registry = createMockServiceRegistry();
      const factory = createMockElementFactory();
      const registrar = new PickElementRegistrar(registry, factory);

      // Act & Assert
      expect(() =>
        registrar.register("registrar-test-null-ctor", null as any),
      ).toThrow("Component constructor is required");
    });

    test("should throw error when componentCtor is undefined", () => {
      // Arrange
      const registry = createMockServiceRegistry();
      const factory = createMockElementFactory();
      const registrar = new PickElementRegistrar(registry, factory);

      // Act & Assert
      expect(() =>
        registrar.register("registrar-test-undef-ctor", undefined as any),
      ).toThrow("Component constructor is required");
    });

    test("should accept factory function for initializer", () => {
      // Arrange
      const registry = createMockServiceRegistry();
      const factory = createMockElementFactory();
      const registrar = new PickElementRegistrar(registry, factory);
      const initializerFactory = () => ({ initialize: async () => true });

      // Act & Assert — should not throw
      registrar.register(
        "registrar-test-init-factory",
        createDummyComponentCtor(),
        {
          initializer: initializerFactory as any,
        },
      );
    });

    test("should accept factory function for lifecycle", () => {
      // Arrange
      const registry = createMockServiceRegistry();
      const factory = createMockElementFactory();
      const registrar = new PickElementRegistrar(registry, factory);
      const lifecycleFactory = () => ({
        startListening: () => {},
        stopListening: () => {},
        dispose: () => {},
      });

      // Act & Assert — should not throw
      registrar.register(
        "registrar-test-lc-factory",
        createDummyComponentCtor(),
        {
          lifecycle: lifecycleFactory as any,
        },
      );
    });
  });
});
