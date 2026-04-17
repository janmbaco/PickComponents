import { test, expect } from "@playwright/test";
import { RenderEngine } from "../../../src/rendering/render-engine.js";
import { PickComponent } from "../../../src/core/pick-component.js";
import type { ComponentMetadata } from "../../../src/core/component-metadata.js";

class TestComponent extends PickComponent {
  rules: Record<string, unknown> = {};
}

function createDomContext() {
  let element: EventTarget | null = null;
  return {
    contextId: "ctx-1",
    destroy: () => {},
    getElement: () => element,
    setElement: (next: EventTarget) => {
      element = next;
    },
    getTargetRoot: () => ({ prepend: () => {} }),
  };
}

test.describe("RenderEngine", () => {
  test("runs initializer before resolving [[RULES.*]]", async () => {
    const order: string[] = [];
    let releasedContextId = "";
    let cachedTemplate = "";

    class HydratingInitializer {
      async initialize(component: TestComponent): Promise<boolean> {
        order.push("initializer");
        component.rules = {
          email: { required: true, minlength: 5 },
        };
        return true;
      }
    }

    const metadata: ComponentMetadata = {
      selector: "test-component",
      template: '<input [[RULES.email]] value="{{email}}" />',
      initializer: () => new HydratingInitializer() as any,
    };

    const domContext = createDomContext();
    const renderEngine = new RenderEngine(
      {
        render: async () => {},
      } as any,
      {
        render: async () => {},
      } as any,
      {
        execute: async (options: any) => {
          expect(options.compiledTemplate.templateString).toContain("required");
          return { cleanup: () => {} };
        },
      } as any,
      {
        create: () => domContext,
      } as any,
      {
        getOrCompile: (_componentId: string, template: string, analyzer: any) => {
          cachedTemplate = template;
          return analyzer.analyze(template);
        },
      } as any,
      {
        analyze: (template: string) => ({
          templateString: template,
          bindings: new Set(["email"]),
          clone() {
            return this;
          },
        }),
      } as any,
      {
        getSource: async (component: TestComponent) => {
          order.push("template-provider");
          expect(component.rules).toEqual({
            email: { required: true, minlength: 5 },
          });
          return '<input required minlength="5" value="{{email}}" />';
        },
      } as any,
      {
        getOrCreate: (_contextId: string, factory: () => TestComponent) => ({
          instance: factory(),
          metadata,
          initPromise: null,
          contextId: domContext.contextId,
        }),
        release: (contextId: string) => {
          releasedContextId = contextId;
        },
      } as any,
      {
        get: () => metadata,
      } as any,
    );

    const result = await renderEngine.render({
      componentId: "test-component",
      component: new TestComponent(),
      targetRoot: {} as HTMLElement,
    });

    expect(order).toEqual(["initializer", "template-provider"]);
    expect(cachedTemplate).toContain('minlength="5"');

    result.cleanup();
    expect(releasedContextId).toBe("ctx-1");
  });

  test("renders initializer failures before template resolution", async () => {
    let errorRendered = false;
    let providerCalled = false;
    let pipelineCalled = false;

    class FailingInitializer {
      async initialize(): Promise<boolean> {
        return false;
      }
    }

    const metadata: ComponentMetadata = {
      selector: "test-component",
      template: "<div>Test</div>",
      initializer: () => new FailingInitializer() as any,
      errorTemplate: '<div role="alert">{{message}}</div>',
    };

    const domContext = createDomContext();
    const renderEngine = new RenderEngine(
      {
        render: async () => {},
      } as any,
      {
        render: async (_domContext: unknown, message: string) => {
          errorRendered = message === "Component initialization failed";
        },
      } as any,
      {
        execute: async () => {
          pipelineCalled = true;
          return { cleanup: () => {} };
        },
      } as any,
      {
        create: () => domContext,
      } as any,
      {
        getOrCompile: () => {
          throw new Error("cache should not be reached");
        },
      } as any,
      {
        analyze: () => {
          throw new Error("analyzer should not be reached");
        },
      } as any,
      {
        getSource: async () => {
          providerCalled = true;
          return "<div>Never reached</div>";
        },
      } as any,
      {
        getOrCreate: (_contextId: string, factory: () => TestComponent) => ({
          instance: factory(),
          metadata,
          initPromise: null,
          contextId: domContext.contextId,
        }),
        release: () => {},
      } as any,
      {
        get: () => metadata,
      } as any,
    );

    await renderEngine.render({
      componentId: "test-component",
      component: new TestComponent(),
      targetRoot: {} as HTMLElement,
    });

    expect(errorRendered).toBe(true);
    expect(providerCalled).toBe(false);
    expect(pipelineCalled).toBe(false);
  });
});
