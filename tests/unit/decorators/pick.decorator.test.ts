import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import { Pick } from "../../../src/decorators/pick.decorator.js";
import { PickComponent } from "../../../src/core/pick-component.js";
import { PickLifecycleManager } from "../../../src/behaviors/pick-lifecycle-manager.js";
import type { IComponentMetadataRegistry } from "../../../src/core/component-metadata-registry.interface.js";
import { Services } from "../../../src/providers/service-provider.js";
import { bootstrapFramework } from "../../../src/providers/framework-bootstrap.js";
import { DefaultListenerInitializer } from "../../../src/decorators/listen/listener-initializer.js";
import { DomContext } from "../../../src/rendering/dom-context/dom-context.js";
import { DomContentType } from "../../../src/rendering/dom-context/dom-context.interface.js";
import type { IIntentSignal } from "../../../src/reactive/signal.js";

test.describe("@Pick DSL Decorator", () => {
  test.beforeEach(async () => {
    Services.clear();
    await bootstrapFramework(Services);
  });

  test.afterEach(() => {
    Services.clear();
  });

  test("should generate component without services dependency", () => {
    // Arrange
    @Pick("test-counter", (ctx) => {
      ctx.state({ count: 0 });
      ctx.on({
        increment() {
          this.count++;
        },
      });
      ctx.html("<div>{{count}}</div>");
    })
    class TestCounter {}

    // Act
    const instance = new TestCounter();

    // Assert - component should NOT have services property visible in public API
    expect(instance).toBeInstanceOf(PickComponent);
    expect("count" in instance).toBe(true);
    expect("increment" in instance).toBe(true);
    expect(typeof (instance as any).getViewActions).toBe("function");
    expect(typeof (instance as any).getViewActions().increment).toBe(
      "function",
    );
    // Services should only be accessible in initializer/lifecycle, not on component
    expect(typeof (instance as any).getServiceProvider).toBe("undefined");
  });

  test("should read props without decorator inputs configuration", () => {
    // Arrange
    @Pick("test-props", (ctx) => {
      ctx.state({ title: "" });
      ctx.props();
      ctx.html("<div>{{title}}</div>");
    })
    class TestProps {}

    // Act
    const instance = new TestProps();

    // Assert - props object should exist for store access
    expect("props" in instance).toBe(true);
    expect(instance.props).toEqual({});
  });

  test("should register refs for template element access", () => {
    // Arrange
    @Pick("test-ref", (ctx) => {
      ctx.ref("input");
      ctx.ref("button");
      ctx.html(`
        <div>
          <input type="text" data-ref="input" />
          <button data-ref="button">Click</button>
        </div>
      `);
    })
    class TestRef {}

    // Act
    const instance = new TestRef();

    // Assert - refs object should exist but be empty until onRenderComplete
    expect("refs" in instance).toBe(true);
    expect(instance.refs).toEqual({});
  });

  test("should register initializer with dependency factory for dependency injection", () => {
    // Arrange
    interface MockService {
      getData(): Promise<string>;
    }

    const mockService: MockService = {
      getData: async () => "test-data",
    };

    let initExecuted = false;

    @Pick("test-inject-map", (ctx) => {
      ctx.state({ data: "" });
      ctx.initializer(
        async function (this: any, _component, deps) {
          initExecuted = true;
          const svc = (deps as { api: MockService }).api;
          this.data = await svc.getData();
        },
        () => ({ api: mockService }),
      );
      ctx.html("<div>{{data}}</div>");
    })
    class TestDependencyFactory {}

    // Act
    void new TestDependencyFactory();

    // Assert - initializer should NOT execute in component constructor
    expect(initExecuted).toBe(false);
    // Initializer executes in pipeline context (verified via integration tests)
  });

  test("should isolate component state from services", () => {
    // Arrange
    @Pick("test-isolation", (ctx) => {
      ctx.state({ count: 0 });
      ctx.on({
        increment() {
          this.count++;
        },
      });
      ctx.initializer(async (component) => {
        // Initializer can use services if needed, but component does NOT
        component.count = 5;
      });
      ctx.html("<div>{{count}}</div>");
    })
    class TestIsolation {}

    // Act
    const instance = new TestIsolation();

    // Assert - component is a plain PickComponent with state and handlers
    expect(instance.count).toBe(0); // State not yet initialized
    expect(typeof instance.increment).toBe("function");
    expect(instance).toBeInstanceOf(PickComponent);
    // Component methods should NOT reference Services
    const methodSource = instance.increment.toString();
    expect(methodSource).not.toContain("Services");
  });

  test("should support computed properties", () => {
    // Arrange
    @Pick("test-computed", (ctx) => {
      ctx.state({ count: 0 });
      ctx.computed({
        doubled() {
          return this.count * 2;
        },
      });
      ctx.html("<div>{{doubled}}</div>");
    })
    class TestComputed {}

    // Act
    const instance = new TestComputed();
    instance.count = 5;

    // Assert
    expect(instance.doubled).toBe(10);
  });

  test("should create per-instance intent signals declared with ctx.intent", () => {
    // Arrange
    type PickIntentHost = PickComponent & {
      modeRequested$: IIntentSignal<string>;
      requestMode(mode: string): void;
    };

    @Pick("test-pick-intent", (ctx) => {
      ctx.intent<string>("modeRequested$");
      ctx.on({
        requestMode(mode: string) {
          (this as PickIntentHost).modeRequested$.notify(mode);
        },
      });
      ctx.html("<div></div>");
    })
    class TestPickIntent {}

    // Act
    const first = new TestPickIntent() as PickIntentHost;
    const second = new TestPickIntent() as PickIntentHost;
    const values: string[] = [];
    first.modeRequested$.subscribe((mode) => {
      values.push(mode);
    });

    first.requestMode("time_trial");
    second.requestMode("mass_start");

    // Assert
    expect(values).toEqual(["time_trial"]);
    expect(first.modeRequested$).not.toBe(second.modeRequested$);
  });

  test("should listen to delegated DOM events declared with ctx.listen", () => {
    // Arrange
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    const originalDocument = globalThis.document;
    const originalHTMLElement = globalThis.HTMLElement;
    const originalElement = globalThis.Element;
    const originalNode = globalThis.Node;

    (globalThis as any).document = dom.window.document;
    (globalThis as any).HTMLElement = dom.window.HTMLElement;
    (globalThis as any).Element = dom.window.Element;
    (globalThis as any).Node = dom.window.Node;

    try {
      @Pick("test-pick-listen", (ctx) => {
        ctx.state({ name: "" });
        ctx.listen("#nameField", "input", function (event) {
          this.name = (event.target as HTMLInputElement).value;
        });
        ctx.html("<section></section>");
      })
      class TestPickListen {}

      const instance = new TestPickListen();
      const targetRoot = dom.window.document.createElement("div");
      dom.window.document.body.appendChild(targetRoot);
      const root = dom.window.document.createElement("section");
      const domContext = new DomContext(targetRoot);
      domContext.setElement(root, DomContentType.COMPONENT);

      new DefaultListenerInitializer().initialize(domContext, instance);

      const input = dom.window.document.createElement("input");
      input.id = "nameField";
      input.value = "Ada";
      root.appendChild(input);

      // Act
      input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));

      // Assert
      expect(instance.name).toBe("Ada");
    } finally {
      globalThis.document = originalDocument;
      globalThis.HTMLElement = originalHTMLElement;
      globalThis.Element = originalElement;
      globalThis.Node = originalNode;
    }
  });

  test("should support lifecycle hooks in component context", () => {
    // Arrange
    let initCalled = false;
    let destroyCalled = false;

    @Pick("test-lifecycle", (ctx) => {
      ctx.state({ value: 0 });
      ctx.lifecycle({
        onInit() {
          initCalled = true;
        },
        onDestroy() {
          destroyCalled = true;
        },
      });
      ctx.html("<div>{{value}}</div>");
    })
    class TestLifecycle {}

    // Act
    const instance = new TestLifecycle();
    const metadata = Services.get<IComponentMetadataRegistry>(
      "IComponentMetadataRegistry",
    ).get("test-lifecycle");
    const lifecycleFactory = metadata!.lifecycle!;
    const lifecycle = lifecycleFactory() as PickLifecycleManager;
    lifecycle.startListening(instance);
    lifecycle.stopListening();

    // Assert
    expect(initCalled).toBe(true);
    expect(destroyCalled).toBe(true);
  });

  test("should preserve class methods from target", () => {
    // Arrange
    @Pick("test-hybrid", (ctx) => {
      ctx.state({ items: [] });
      ctx.html("<div></div>");
    })
    class TestHybrid {
      customHelper() {
        return this.items.length;
      }
    }

    // Act
    const instance = new TestHybrid();
    instance.items = [1, 2, 3];

    // Assert
    expect(instance.customHelper()).toBe(3);
  });
});
