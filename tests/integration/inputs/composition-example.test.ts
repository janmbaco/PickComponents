import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import { RenderEngine } from "../../../src/rendering/render-engine.js";
import { PickComponent } from "../../../src/core/pick-component.js";
import { PickRender } from "../../../src/decorators/pick-render.decorator.js";
import { Reactive } from "../../../src/decorators/index.js";
import { Services } from "../../../src/providers/service-provider.js";
import { bootstrapFramework } from "../../../src/providers/framework-bootstrap.js";

/**
 * Integration tests for parent → child attribute binding via component composition.
 *
 * Tests cover the concrete bug found in example 05 (Composition):
 *   - A parent component renders a child PickComponent in its template
 *     passing reactive data as HTML attributes: <slide-card title="{{currentTitle}}">.
 *   - When the parent state changes (next()), the BindingResolver calls
 *     setAttribute("title", newValue) on the child element in the DOM.
 *   - A child component with @Reactive field-form properties exposes them as
 *     own enumerable properties → Object.keys() picks them up → they appear
 *     in observedAttributes → attributeChangedCallback fires on attribute change.
 *
 * NOTE: The attributeChangedCallback → child re-render cycle requires the
 * Custom Elements API (real browser). These tests verify the binding layer:
 * that the parent's reactive bindings correctly update the child's HTML attributes.
 * The attributeChangedCallback contract is covered by the unit tests in
 * tests/unit/registration/pick-element-factory.test.ts.
 */
test.describe("Composition: parent → child attribute binding", () => {
  let dom: JSDOM;
  let document: Document;
  let renderEngine: RenderEngine;
  let targetRoot: HTMLElement;

  test.beforeEach(async () => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document as unknown as Document;
    (global as any).document = document;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).Element = dom.window.Element;
    (global as any).Node = dom.window.Node;
    (global as any).CustomEvent = dom.window.CustomEvent;
    (global as any).MutationObserver = dom.window.MutationObserver;

    Services.clear();
    await bootstrapFramework(Services);
    renderEngine = Services.get<RenderEngine>("IRenderEngine");

    targetRoot = document.createElement("div");
    document.body.appendChild(targetRoot);
  });

  test.afterEach(() => {
    Services.clear();
    delete (global as any).document;
    delete (global as any).HTMLElement;
    delete (global as any).Element;
    delete (global as any).Node;
    delete (global as any).CustomEvent;
    delete (global as any).MutationObserver;
  });

  test("should render child element with initial title attribute from parent state", async () => {
    // Arrange
    @PickRender({
      selector: "slide-card-a",
      template: `<header>{{title}}</header>`,
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class SlideCardA extends PickComponent {
      @Reactive title = "";
      @Reactive body = "";
    }

    @PickRender({
      selector: "composition-a",
      template: `<slide-card-a title="{{currentTitle}}" body="{{currentBody}}"></slide-card-a>`,
    })
    class CompositionA extends PickComponent {
      @Reactive accessor index = 0;
      readonly titles = ["Hello", "Component Composition", "Web Standards"];
      readonly bodies = ["First", "Second", "Third"];
      get currentTitle(): string {
        return this.titles[this.index];
      }
      get currentBody(): string {
        return this.bodies[this.index];
      }
      next(): void {
        this.index = (this.index + 1) % this.titles.length;
      }
    }

    const component = new CompositionA();
    const host = document.createElement("composition-a");

    // Act
    await renderEngine.render({
      componentId: "composition-a",
      component,
      targetRoot,
      hostElement: host,
    });

    // Assert — child element has initial title attribute set by parent binding
    const slideCard = targetRoot.querySelector("slide-card-a")!;
    expect(slideCard).not.toBeNull();
    expect(slideCard.getAttribute("title")).toBe("Hello");
    expect(slideCard.getAttribute("body")).toBe("First");
  });

  test("should update child title attribute when parent calls next()", async () => {
    // Arrange
    @PickRender({
      selector: "slide-card-b",
      template: `<header>{{title}}</header>`,
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class SlideCardB extends PickComponent {
      @Reactive title = "";
      @Reactive body = "";
    }

    @PickRender({
      selector: "composition-b",
      template: `<slide-card-b title="{{currentTitle}}" body="{{currentBody}}"></slide-card-b>`,
    })
    class CompositionB extends PickComponent {
      @Reactive accessor index = 0;
      readonly titles = ["Hello", "Component Composition", "Web Standards"];
      readonly bodies = ["First", "Second", "Third"];
      get currentTitle(): string {
        return this.titles[this.index];
      }
      get currentBody(): string {
        return this.bodies[this.index];
      }
      next(): void {
        this.index = (this.index + 1) % this.titles.length;
      }
    }

    const component = new CompositionB();
    const host = document.createElement("composition-b");
    await renderEngine.render({
      componentId: "composition-b",
      component,
      targetRoot,
      hostElement: host,
    });

    // Act — simulate "Next slide" button click
    component.next();

    // Assert — child element title attribute updated by parent reactive binding
    const slideCard = targetRoot.querySelector("slide-card-b")!;
    expect(slideCard.getAttribute("title")).toBe("Component Composition");
    expect(slideCard.getAttribute("body")).toBe("Second");
  });

  test("should cycle through all slides on repeated next() calls", async () => {
    // Arrange
    @PickRender({
      selector: "slide-card-c",
      template: `<header>{{title}}</header>`,
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class SlideCardC extends PickComponent {
      @Reactive title = "";
      @Reactive body = "";
    }

    @PickRender({
      selector: "composition-c",
      template: `<slide-card-c title="{{currentTitle}}" body="{{currentBody}}"></slide-card-c>`,
    })
    class CompositionC extends PickComponent {
      @Reactive accessor index = 0;
      readonly titles = ["Hello", "Component Composition", "Web Standards"];
      readonly bodies = ["First", "Second", "Third"];
      get currentTitle(): string {
        return this.titles[this.index];
      }
      get currentBody(): string {
        return this.bodies[this.index];
      }
      next(): void {
        this.index = (this.index + 1) % this.titles.length;
      }
    }

    const component = new CompositionC();
    const host = document.createElement("composition-c");
    await renderEngine.render({
      componentId: "composition-c",
      component,
      targetRoot,
      hostElement: host,
    });
    const slideCard = targetRoot.querySelector("slide-card-c")!;

    // Act & Assert — first slide
    expect(slideCard.getAttribute("title")).toBe("Hello");

    component.next();
    expect(slideCard.getAttribute("title")).toBe("Component Composition");

    component.next();
    expect(slideCard.getAttribute("title")).toBe("Web Standards");

    // Act & Assert — wraps back to first
    component.next();
    expect(slideCard.getAttribute("title")).toBe("Hello");
  });

  test("should update child attribute when child uses accessor-form reactive", async () => {
    // Arrange — verifies that @Reactive accessor properties on a child component
    // work correctly with parent → child attribute binding.
    // The PickElementFactory includes prototype accessors with both get AND set
    // in observedAttributes, so attributeChangedCallback fires when parent updates
    // the child's attribute.
    @PickRender({
      selector: "slide-card-d",
      template: `<header>{{title}}</header>`,
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class SlideCardD extends PickComponent {
      @Reactive accessor title = "";
      @Reactive accessor body = "";
    }

    @PickRender({
      selector: "composition-d",
      template: `<slide-card-d title="{{currentTitle}}" body="{{currentBody}}"></slide-card-d>`,
    })
    class CompositionD extends PickComponent {
      @Reactive accessor index = 0;
      readonly titles = ["Hello", "Component Composition"];
      readonly bodies = ["First", "Second"];
      get currentTitle(): string {
        return this.titles[this.index];
      }
      get currentBody(): string {
        return this.bodies[this.index];
      }
      next(): void {
        this.index = (this.index + 1) % this.titles.length;
      }
    }

    const component = new CompositionD();
    const host = document.createElement("composition-d");
    await renderEngine.render({
      componentId: "composition-d",
      component,
      targetRoot,
      hostElement: host,
    });

    component.next();

    // Assert — parent's binding sets the attribute on the child DOM element
    const slideCard = targetRoot.querySelector("slide-card-d")!;
    expect(slideCard.getAttribute("title")).toBe("Component Composition");
    expect(slideCard.getAttribute("body")).toBe("Second");
  });
});
