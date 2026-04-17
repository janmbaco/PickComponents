import { test, expect } from "@playwright/test";
import { Pick } from "../../../src/decorators/pick.decorator.js";
import { Services } from "../../../src/providers/service-provider.js";
import { bootstrapFramework } from "../../../src/providers/framework-bootstrap.js";

/**
 * Tests for lazy generation: @Pick should NOT generate initializer/lifecycle if not needed
 */
test.describe("@Pick - Lazy Generation", () => {
  test.beforeEach(async () => {
    Services.clear();
    await bootstrapFramework(Services);
  });

  test.afterEach(() => {
    Services.clear();
  });

  test("should create presentational component", () => {
    // Type 1: only html/css, no state, no initializer
    @Pick("test-type1", (ctx) => {
      ctx.html(`<div>Hello World</div>`);
      ctx.css(`.container { color: blue; }`);
    })
    class Type1Component {}

    expect(Type1Component).toBeDefined();
    const instance = new Type1Component();
    expect(instance).toBeDefined();
  });

  test("should create props component", () => {
    // Type 2: props only (read-only), no initializer
    @Pick("test-type2", (ctx) => {
      ctx.props<{ name: string }>();
      ctx.html(`<div>Hello {{name}}</div>`);
    })
    class Type2Component {}

    expect(Type2Component).toBeDefined();
    const instance = new Type2Component();
    expect(instance).toBeDefined();
  });

  test("should create component with initializer and dependency factory", () => {
    @Pick("test-with-inject", (ctx) => {
      ctx.state({ count: 0 });
      ctx.initializer(
        async (component, deps) => {
          const value = deps ? (deps as Record<string, number>).startValue : 42;
          component.count = value;
        },
        () => ({ startValue: 42 }),
      );
      ctx.html(`<div>{{count}}</div>`);
    })
    class WithDependencyFactory {}

    expect(WithDependencyFactory).toBeDefined();
    const instance = new WithDependencyFactory();
    expect(instance).toBeDefined();
  });

  test("should create component with initializer", () => {
    @Pick("test-with-initializer", (ctx) => {
      ctx.state({ data: null });
      ctx.initializer(async (component) => {
        component.data = await Promise.resolve({ id: 1 });
      });
      ctx.html(`<div>{{data?.id}}</div>`);
    })
    class WithInitializer {}

    expect(WithInitializer).toBeDefined();
    const instance = new WithInitializer();
    expect(instance).toBeDefined();
  });

  test("should create component with lifecycle hooks", () => {
    @Pick("test-with-lifecycle-hooks", (ctx) => {
      ctx.state({ mounted: false });
      ctx.lifecycle({
        onInit() {
          this.mounted = true;
        },
      });
      ctx.html(`<div>{{mounted}}</div>`);
    })
    class WithLifecycleHooks {}

    expect(WithLifecycleHooks).toBeDefined();
    const instance = new WithLifecycleHooks();
    expect(instance).toBeDefined();
  });

  test("should create minimal component with state only", () => {
    @Pick("test-minimal", (ctx) => {
      ctx.state({ count: 0 });
      ctx.on({
        increment() {
          this.count++;
        },
      });
      ctx.html(`<div>{{count}}</div>`);
    })
    class MinimalComponent {}

    expect(MinimalComponent).toBeDefined();
    const instance = new MinimalComponent();
    expect((instance as any).count).toBe(0);
    (instance as any).increment();
    expect((instance as any).count).toBe(1);
  });
});
