import { test, expect } from "@playwright/test";
import { ComponentInstanceRegistry } from "../../../src/core/component-instance-registry.js";
import { ComponentMetadata } from "../../../src/core/component-metadata.js";
import { PickComponent } from "../../../src/core/pick-component.js";

class TestComponent extends PickComponent {
  destroyed = false;

  onDestroy(): void {
    this.destroyed = true;
    super.onDestroy();
  }
}

const TEST_METADATA: ComponentMetadata = {
  selector: "test",
  template: "<div></div>",
};

test.describe("ComponentInstanceRegistry", () => {
  test.describe("getOrCreate()", () => {
    test("should create new instance for each context", () => {
      // Arrange
      const registry = new ComponentInstanceRegistry();
      let instanceCount = 0;
      const factory = () => {
        instanceCount++;
        return new TestComponent();
      };

      // Act
      const entry1 = registry.getOrCreate("ctx-1", factory, TEST_METADATA);
      const entry2 = registry.getOrCreate("ctx-2", factory, TEST_METADATA);

      // Assert
      expect(instanceCount).toBe(2);
      expect(entry1.instance).not.toBe(entry2.instance);
      expect(entry1.contextId).toBe("ctx-1");
      expect(entry2.contextId).toBe("ctx-2");
    });

    test("should return same instance for same context", () => {
      // Arrange
      const registry = new ComponentInstanceRegistry();
      let instanceCount = 0;
      const factory = () => {
        instanceCount++;
        return new TestComponent();
      };

      // Act
      const entry1 = registry.getOrCreate("ctx-1", factory, TEST_METADATA);
      const entry2 = registry.getOrCreate("ctx-1", factory, TEST_METADATA);

      // Assert
      expect(instanceCount).toBe(1);
      expect(entry1.instance).toBe(entry2.instance);
      expect(entry1.contextId).toBe("ctx-1");
    });

    test("should create instance with correct metadata", () => {
      // Arrange
      const registry = new ComponentInstanceRegistry();
      const metadata: ComponentMetadata = {
        selector: "test",
        template: "<div>{{value}}</div>",
      };

      // Act
      const entry = registry.getOrCreate(
        "ctx-1",
        () => new TestComponent(),
        metadata,
      );

      // Assert
      expect(entry.instance).toBeInstanceOf(TestComponent);
      expect(entry.metadata).toBe(metadata);
      expect(entry.contextId).toBe("ctx-1");
      expect(entry.initPromise).toBeNull();
    });

    test("should throw when contextId is null", () => {
      // Arrange
      const registry = new ComponentInstanceRegistry();

      // Act & Assert
      expect(() =>
        registry.getOrCreate(
          null as any,
          () => new TestComponent(),
          TEST_METADATA,
        ),
      ).toThrow("ContextId is required");
    });

    test("should throw when factory is null", () => {
      // Arrange
      const registry = new ComponentInstanceRegistry();

      // Act & Assert
      expect(() =>
        registry.getOrCreate("ctx-1", null as any, TEST_METADATA),
      ).toThrow("Factory is required");
    });

    test("should throw when metadata is null", () => {
      // Arrange
      const registry = new ComponentInstanceRegistry();

      // Act & Assert
      expect(() =>
        registry.getOrCreate("ctx-1", () => new TestComponent(), null as any),
      ).toThrow("Metadata is required");
    });
  });

  test.describe("release()", () => {
    test("should destroy and remove instance by contextId", () => {
      // Arrange
      const registry = new ComponentInstanceRegistry();
      const entry = registry.getOrCreate(
        "ctx-1",
        () => new TestComponent(),
        TEST_METADATA,
      );
      const component = entry.instance as TestComponent;

      // Act
      registry.release("ctx-1");

      // Assert — component was destroyed and slot is freed for a new instance
      expect(component.destroyed).toBe(true);
      const entry2 = registry.getOrCreate(
        "ctx-1",
        () => new TestComponent(),
        TEST_METADATA,
      );
      expect(entry2.instance).not.toBe(component);
    });

    test("should not affect other contexts", () => {
      // Arrange
      const registry = new ComponentInstanceRegistry();
      const entry1 = registry.getOrCreate(
        "ctx-1",
        () => new TestComponent(),
        TEST_METADATA,
      );
      const entry2 = registry.getOrCreate(
        "ctx-2",
        () => new TestComponent(),
        TEST_METADATA,
      );
      const component1 = entry1.instance as TestComponent;
      const component2 = entry2.instance as TestComponent;

      // Act
      registry.release("ctx-1");

      // Assert
      expect(component1.destroyed).toBe(true);
      expect(component2.destroyed).toBe(false);
      const entry2Again = registry.getOrCreate(
        "ctx-2",
        () => new TestComponent(),
        TEST_METADATA,
      );
      expect(entry2Again.instance).toBe(component2);
    });

    test("should be idempotent for non-existent context", () => {
      // Arrange
      const registry = new ComponentInstanceRegistry();

      // Act & Assert
      expect(() => registry.release("non-existent")).not.toThrow();
    });

    test("should throw when contextId is null", () => {
      // Arrange
      const registry = new ComponentInstanceRegistry();

      // Act & Assert
      expect(() => registry.release(null as any)).toThrow(
        "ContextId is required",
      );
    });
  });
});
