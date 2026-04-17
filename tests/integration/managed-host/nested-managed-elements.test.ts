import { test, expect } from "@playwright/test";
import { RenderEngine } from "../../../src/rendering/render-engine.js";
import { PickComponent } from "../../../src/core/pick-component.js";
import { PickRender } from "../../../src/decorators/pick-render.decorator.js";
import { ManagedElementRegistry } from "../../../src/rendering/managed-host/managed-element-registry.js";
import { Services } from "../../../src/providers/service-provider.js";
import { bootstrapFramework } from "../../../src/providers/framework-bootstrap.js";
import { JSDOM } from "jsdom";

/**
 * Integration tests for nested managed elements.
 *
 * Validates that managed element detection uses registry-based approach,
 * NOT tag name heuristics. Tests cover:
 * - Nested managed elements (registered components) keep attributes with objectId values
 * - Custom elements NOT registered as components keep attributes with literal values
 * - Registry-based detection works regardless of tag name pattern
 */
test.describe("Nested Managed Elements", () => {
  let dom: JSDOM;
  let document: Document;
  let renderEngine: RenderEngine;

  test.beforeEach(async () => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    (global as any).document = document;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).Element = dom.window.Element;
    (global as any).Node = dom.window.Node;
    (global as any).CustomEvent = dom.window.CustomEvent;

    Services.clear();
    await bootstrapFramework(Services);
    renderEngine = Services.get<RenderEngine>("IRenderEngine");
  });

  test.afterEach(() => {
    Services.clear();
    delete (global as any).document;
    delete (global as any).HTMLElement;
    delete (global as any).Element;
    delete (global as any).Node;
    delete (global as any).CustomEvent;
  });

  test.describe("nested managed elements with non-pick-* tag names", () => {
    test("should keep attributes with objectId for nested managed element (registry-based, not tag name)", async () => {
      // Arrange - Register nested component FIRST (simulates decorator registration)
      @PickRender({
        selector: "x-nested-child",
        template: "<div>Child content</div>",
      })
      class NestedChild extends PickComponent {}
      void NestedChild;

      @PickRender({
        selector: "test-parent-component",
        template:
          '<div><x-nested-child data="{{items}}"></x-nested-child></div>',
      })
      class ParentComponent extends PickComponent {
        items = ["a", "b", "c"];
      }

      const host = document.createElement("test-parent-component");
      const targetRoot = document.createElement("div");
      document.body.appendChild(targetRoot);

      const component = new ParentComponent();

      // Act
      await renderEngine.render({
        componentId: "test-parent-component",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert - nested element should be registered as managed
      const nestedElement = targetRoot.querySelector(
        "x-nested-child",
      ) as HTMLElement;
      expect(nestedElement).not.toBeNull();

      // Nested element is managed (registered by TemplateCompiler)
      expect(ManagedElementRegistry.isManagedElement(nestedElement!)).toBe(
        true,
      );

      // Attribute stays on element with objectId value (visible in DOM)
      expect(nestedElement!.hasAttribute("data")).toBe(true);
      expect(nestedElement!.getAttribute("data")).toMatch(/^__obj_/);
    });

    test("should NOT cleanup inputs for custom element that is NOT registered as managed", async () => {
      // Arrange - Create component with custom element that is NOT registered
      @PickRender({
        selector: "test-unmanaged-parent",
        template:
          '<div><x-not-registered data="value"></x-not-registered></div>',
      })
      class ParentComponent extends PickComponent {}

      const host = document.createElement("test-unmanaged-parent");
      const targetRoot = document.createElement("div");
      document.body.appendChild(targetRoot);

      const component = new ParentComponent();

      // Act
      await renderEngine.render({
        componentId: "test-unmanaged-parent",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert - custom element should NOT be managed
      const customElement = targetRoot.querySelector(
        "x-not-registered",
      ) as HTMLElement;
      expect(customElement).not.toBeNull();

      // Element is NOT managed (not registered)
      expect(ManagedElementRegistry.isManagedElement(customElement!)).toBe(
        false,
      );

      // Attribute should remain with its literal value
      expect(customElement!.getAttribute("data")).toBe("value");
    });

    test("should handle mixed managed and unmanaged nested elements", async () => {
      // Arrange
      @PickRender({
        selector: "x-managed-nested",
        template: "<span>Managed</span>",
      })
      class ManagedNested extends PickComponent {}
      void ManagedNested;

      @PickRender({
        selector: "test-mixed-parent",
        template:
          '<div><x-managed-nested items="{{messages}}"></x-managed-nested><x-unmanaged-nested title="static"></x-unmanaged-nested></div>',
      })
      class ParentComponent extends PickComponent {
        messages = ["hello", "world"];
      }

      const host = document.createElement("test-mixed-parent");
      const targetRoot = document.createElement("div");
      document.body.appendChild(targetRoot);

      const component = new ParentComponent();

      // Act
      await renderEngine.render({
        componentId: "test-mixed-parent",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert - managed nested: attribute stays with objectId
      const managedNested = targetRoot.querySelector(
        "x-managed-nested",
      ) as HTMLElement;
      expect(ManagedElementRegistry.isManagedElement(managedNested!)).toBe(
        true,
      );
      expect(managedNested!.hasAttribute("items")).toBe(true);
      expect(managedNested!.getAttribute("items")).toMatch(/^__obj_/);

      // Assert - unmanaged nested: attribute stays with literal value
      const unmanagedNested = targetRoot.querySelector(
        "x-unmanaged-nested",
      ) as HTMLElement;
      expect(ManagedElementRegistry.isManagedElement(unmanagedNested!)).toBe(
        false,
      );
      expect(unmanagedNested!.getAttribute("title")).toBe("static");
    });
  });

  test.describe("registry-based detection (no tag name dependency)", () => {
    test("should treat pick-* element as unmanaged if not registered", async () => {
      // Arrange - Element with pick-* prefix but NOT registered as component
      @PickRender({
        selector: "test-pick-prefix-parent",
        template:
          '<div><pick-unregistered-element data="value"></pick-unregistered-element></div>',
      })
      class ParentComponent extends PickComponent {}

      const host = document.createElement("test-pick-prefix-parent");
      const targetRoot = document.createElement("div");
      document.body.appendChild(targetRoot);

      const component = new ParentComponent();

      // Act
      await renderEngine.render({
        componentId: "test-pick-prefix-parent",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert - even though tag has "pick-" prefix, it's NOT managed
      const pickElement = targetRoot.querySelector(
        "pick-unregistered-element",
      ) as HTMLElement;
      expect(pickElement).not.toBeNull();

      // NOT managed (not in registry)
      expect(ManagedElementRegistry.isManagedElement(pickElement!)).toBe(
        false,
      );

      // Attribute remains (no cleanup)
      expect(pickElement!.getAttribute("data")).toBe("value");
    });

    test("should keep attributes with objectId for any registered component regardless of tag name pattern", async () => {
      // Arrange - Component with no "pick-" prefix
      @PickRender({
        selector: "totally-custom-element",
        template: "<p>Custom</p>",
      })
      class CustomElement extends PickComponent {}
      void CustomElement;

      @PickRender({
        selector: "test-custom-parent",
        template:
          '<div><totally-custom-element items="{{data}}"></totally-custom-element></div>',
      })
      class ParentComponent extends PickComponent {
        data = { key: "value" };
      }

      const host = document.createElement("test-custom-parent");
      const targetRoot = document.createElement("div");
      document.body.appendChild(targetRoot);

      const component = new ParentComponent();

      // Act
      await renderEngine.render({
        componentId: "test-custom-parent",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert - managed despite non-standard tag name
      const customElement = targetRoot.querySelector(
        "totally-custom-element",
      ) as HTMLElement;
      expect(customElement).not.toBeNull();

      // IS managed (in registry via decorator)
      expect(ManagedElementRegistry.isManagedElement(customElement!)).toBe(
        true,
      );

      // Attribute stays with objectId value
      expect(customElement!.hasAttribute("items")).toBe(true);
      expect(customElement!.getAttribute("items")).toMatch(/^__obj_/);
    });
  });

  test.describe("cleanup on component destroy", () => {
    test("should unregister managed elements on cleanup", async () => {
      // Arrange
      @PickRender({
        selector: "test-cleanup-component",
        template: "<div>Content</div>",
      })
      class TestComponent extends PickComponent {}

      const host = document.createElement("test-cleanup-component");
      const targetRoot = document.createElement("div");
      document.body.appendChild(targetRoot);

      const component = new TestComponent();

      // Act
      const result = await renderEngine.render({
        componentId: "test-cleanup-component",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert - elements registered
      expect(ManagedElementRegistry.isManagedElement(host)).toBe(true);
      const rootElement = targetRoot.firstElementChild as HTMLElement;
      expect(ManagedElementRegistry.isManagedElement(rootElement!)).toBe(true);

      // Cleanup
      result.cleanup();

      // Assert - elements unregistered
      expect(ManagedElementRegistry.isManagedElement(host)).toBe(false);
      expect(ManagedElementRegistry.isManagedElement(rootElement!)).toBe(false);
    });
  });
});
