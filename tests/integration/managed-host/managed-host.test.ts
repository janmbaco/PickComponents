import { test, expect } from "@playwright/test";
import { RenderEngine } from "../../../src/rendering/render-engine.js";
import { PickComponent } from "../../../src/core/pick-component.js";
import { PickRender } from "../../../src/decorators/pick-render.decorator.js";
import { Services } from "../../../src/providers/service-provider.js";
import { bootstrapFramework } from "../../../src/providers/framework-bootstrap.js";
import { JSDOM } from "jsdom";

/**
 * Integration tests for Managed Host behavior in the rendering pipeline.
 *
 * A managed host is an element rendered by the Pick Components engine with
 * an associated PickComponent instance. These tests verify:
 * - Class/ID migration from host to outlet
 * - Input attributes remain visible on host (no cleanup)
 * - Behavior for all input types (primitives, objects, mixed content)
 */
test.describe("Managed Host Integration", () => {
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

  test.describe("class attribute migration", () => {
    test("should migrate literal class from host to outlet", async () => {
      // Arrange
      @PickRender({
        selector: "test-class-literal",
        template: '<div class="outlet">Content</div>',
      })
      class TestComponent extends PickComponent {}

      const host = document.createElement("test-class-literal");
      host.className = "btn primary";
      const targetRoot = document.createElement("div");
      document.body.appendChild(targetRoot);

      const component = new TestComponent();

      // Act
      await renderEngine.render({
        componentId: "test-class-literal",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert
      const outlet = targetRoot.querySelector(".outlet") as HTMLElement;
      expect(outlet).not.toBeNull();
      expect(outlet!.className).toContain("btn");
      expect(outlet!.className).toContain("primary");
      expect(outlet!.className).toContain("outlet");
      expect(host.hasAttribute("class")).toBe(false);
    });

    test("should merge host and outlet classes with deduplication", async () => {
      // Arrange
      @PickRender({
        selector: "test-class-merge",
        template: '<div class="outlet base">Content</div>',
      })
      class TestComponent extends PickComponent {}

      const host = document.createElement("test-class-merge");
      host.className = "btn base"; // 'base' is duplicate
      const targetRoot = document.createElement("div");
      document.body.appendChild(targetRoot);

      const component = new TestComponent();

      // Act
      await renderEngine.render({
        componentId: "test-class-merge",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert
      const outlet = targetRoot.querySelector(".outlet") as HTMLElement;
      const classes = outlet!.className.split(/\s+/);
      expect(classes.filter((c) => c === "base").length).toBe(1); // No duplicates
      expect(classes).toContain("btn");
      expect(classes.indexOf("btn")).toBeLessThan(classes.indexOf("outlet")); // Host-first order
    });
  });

  test.describe("id attribute migration", () => {
    test("should migrate id from host to outlet when no conflict", async () => {
      // Arrange
      @PickRender({
        selector: "test-id-no-conflict",
        template: '<div class="outlet">Content</div>',
      })
      class TestComponent extends PickComponent {}

      const host = document.createElement("test-id-no-conflict");
      host.id = "my-component";
      const targetRoot = document.createElement("div");
      document.body.appendChild(targetRoot);

      const component = new TestComponent();

      // Act
      await renderEngine.render({
        componentId: "test-id-no-conflict",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert
      const outlet = targetRoot.querySelector(".outlet") as HTMLElement;
      expect(outlet!.id).toBe("my-component");
      expect(host.hasAttribute("id")).toBe(false);
    });

    test("should NOT overwrite outlet id in conflict (conservative)", async () => {
      // Arrange
      @PickRender({
        selector: "test-id-conflict",
        template: '<div id="outlet-id" class="outlet">Content</div>',
      })
      class TestComponent extends PickComponent {}

      const host = document.createElement("test-id-conflict");
      host.id = "host-id";
      const targetRoot = document.createElement("div");
      document.body.appendChild(targetRoot);

      const component = new TestComponent();

      // Act
      await renderEngine.render({
        componentId: "test-id-conflict",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert
      const outlet = targetRoot.querySelector(".outlet") as HTMLElement;
      expect(outlet!.id).toBe("outlet-id"); // Outlet keeps its id
      expect(host.id).toBe("host-id"); // Host keeps its id (conservative fallback)
    });
  });

  test.describe("input attribute preservation", () => {
    test("should preserve primitive input attributes on host element", async () => {
      // Arrange
      @PickRender({
        selector: "test-primitive-input",
        template: '<div class="outlet">Content</div>',
      })
      class TestComponent extends PickComponent {}

      const host = document.createElement("test-primitive-input");
      host.setAttribute("title", "My Title");
      host.setAttribute("count", "42");
      const targetRoot = document.createElement("div");
      document.body.appendChild(targetRoot);

      const component = new TestComponent();

      // Act
      await renderEngine.render({
        componentId: "test-primitive-input",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert — attributes remain visible on host (no cleanup)
      expect(host.getAttribute("title")).toBe("My Title");
      expect(host.getAttribute("count")).toBe("42");
    });

    test("should preserve mixed content input attribute on host element", async () => {
      // Arrange
      @PickRender({
        selector: "test-mixed-input",
        template: '<div class="outlet">Content</div>',
      })
      class TestComponent extends PickComponent {
        name = "World";
      }

      const host = document.createElement("test-mixed-input");
      host.setAttribute("msg", "Hello {{name}}!");
      const targetRoot = document.createElement("div");
      document.body.appendChild(targetRoot);

      const component = new TestComponent();

      // Act
      await renderEngine.render({
        componentId: "test-mixed-input",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert — attribute remains on host with resolved value
      expect(host.hasAttribute("msg")).toBe(true);
    });

    test("should preserve reserved attributes (data-*, aria-*)", async () => {
      // Arrange
      @PickRender({
        selector: "test-reserved-attrs",
        template: '<div class="outlet">Content</div>',
      })
      class TestComponent extends PickComponent {}

      const host = document.createElement("test-reserved-attrs");
      host.setAttribute("data-test", "test-value");
      host.setAttribute("aria-label", "Label");
      const targetRoot = document.createElement("div");
      document.body.appendChild(targetRoot);

      const component = new TestComponent();

      // Act
      await renderEngine.render({
        componentId: "test-reserved-attrs",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert - Reserved attributes remain on host
      expect(host.getAttribute("data-test")).toBe("test-value");
      expect(host.getAttribute("aria-label")).toBe("Label");
    });
  });

  test.describe("outlet resolution strategies", () => {
    test("should fallback to first child when no .outlet marker", async () => {
      // Arrange
      @PickRender({
        selector: "test-first-child",
        template: "<section>Content</section>",
      })
      class TestComponent extends PickComponent {}

      const host = document.createElement("test-first-child");
      host.className = "host-class";
      const targetRoot = document.createElement("div");
      document.body.appendChild(targetRoot);

      const component = new TestComponent();

      // Act
      await renderEngine.render({
        componentId: "test-first-child",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert
      const section = targetRoot.querySelector("section") as HTMLElement;
      expect(section).not.toBeNull();
      expect(section!.className).toContain("host-class");
      expect(host.hasAttribute("class")).toBe(false);
    });

    test("should fallback to root when multiple children and no .outlet", async () => {
      // Arrange
      @PickRender({
        selector: "test-multi-child",
        template: "<span>A</span><span>B</span>",
      })
      class TestComponent extends PickComponent {}

      const host = document.createElement("test-multi-child");
      host.className = "host-class";
      const targetRoot = document.createElement("div");
      document.body.appendChild(targetRoot);

      const component = new TestComponent();

      // Act
      await renderEngine.render({
        componentId: "test-multi-child",
        component,
        targetRoot,
        hostElement: host,
      });

      // Assert
      const root = targetRoot.firstElementChild as HTMLElement;
      expect(root).not.toBeNull();
      expect(root!.className).toContain("host-class");
      expect(host.hasAttribute("class")).toBe(false);
    });
  });

  test.describe("restrictive parent rendering", () => {
    test("should render the compiled root beside a hidden host under a restrictive list parent", async () => {
      // Arrange
      @PickRender({
        selector: "test-restrictive-list-item",
        template: '<li class="outlet">Projected</li>',
      })
      class TestComponent extends PickComponent {}

      const list = document.createElement("ul");
      document.body.appendChild(list);
      const host = document.createElement("test-restrictive-list-item");
      list.appendChild(host);
      const component = new TestComponent();

      // Act
      const result = await renderEngine.render({
        componentId: "test-restrictive-list-item",
        component,
        targetRoot: list,
        hostElement: host,
      });

      // Assert
      const projectedItem = list.querySelector("li.outlet") as HTMLElement | null;
      expect(projectedItem).not.toBeNull();
      expect(projectedItem?.textContent).toBe("Projected");
      expect(host.style.display).toBe("none");

      result.cleanup();
    });
  });
});
