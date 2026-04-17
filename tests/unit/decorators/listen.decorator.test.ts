import { test, expect } from "@playwright/test";

import { Listen } from "../../../src/decorators/listen.decorator.js";
import type { IListenerMetadataRegistry } from "../../../src/decorators/listen/listener-metadata-registry.interface.js";
import { bootstrapFramework } from "../../../src/providers/framework-bootstrap.js";
import { Services } from "../../../src/providers/service-provider.js";

test.describe("@Listen decorator", () => {
  test.beforeEach(async () => {
    Services.clear();
    await bootstrapFramework(Services);
  });

  test.afterEach(() => {
    Services.clear();
  });

  test("should register listener metadata in legacy decorator mode when auto is enabled", () => {
    class ExampleComponent {
      onClick(): void {
        // noop
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      ExampleComponent.prototype,
      "onClick",
    );

    (
      Listen("click") as unknown as (
        target: object,
        propertyKey: string,
        descriptor?: PropertyDescriptor,
      ) => void
    )(ExampleComponent.prototype, "onClick", descriptor);

    const registry = Services.get<IListenerMetadataRegistry>(
      "IListenerMetadataRegistry",
    );
    expect(registry.get(new ExampleComponent())).toEqual([
      {
        methodName: "onClick",
        eventName: "click",
        selector: null,
      },
    ]);
  });

  test("should register listener metadata in TC39 decorator mode", () => {
    class ExampleComponent {
      onSave(): void {
        // noop
      }
    }

    const initializers: Array<(this: ExampleComponent) => void> = [];
    (
      Listen(".save", "click") as unknown as (
        value: (...args: never[]) => unknown,
        context: ClassMethodDecoratorContext<ExampleComponent>,
      ) => void
    )(ExampleComponent.prototype.onSave, {
      kind: "method",
      name: "onSave",
      static: false,
      private: false,
      access: {
        has(instance: ExampleComponent) {
          return "onSave" in instance;
        },
        get(instance: ExampleComponent) {
          return instance.onSave;
        },
      },
      addInitializer(initializer) {
        initializers.push(initializer as (this: ExampleComponent) => void);
      },
      metadata: undefined,
    } as ClassMethodDecoratorContext<ExampleComponent>);

    const instance = new ExampleComponent();
    for (const initializer of initializers) {
      initializer.call(instance);
    }

    const registry = Services.get<IListenerMetadataRegistry>(
      "IListenerMetadataRegistry",
    );
    expect(registry.get(instance)).toEqual([
      {
        methodName: "onSave",
        eventName: "click",
        selector: ".save",
      },
    ]);
  });

  test("should reject legacy decorator mode in strict bootstrap", async () => {
    Services.clear();
    await bootstrapFramework(Services, {}, { decorators: "strict" });

    class ExampleComponent {
      onClick(): void {
        // noop
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      ExampleComponent.prototype,
      "onClick",
    );

    expect(() =>
      (
        Listen("click") as unknown as (
          target: object,
          propertyKey: string,
          descriptor?: PropertyDescriptor,
        ) => void
      )(ExampleComponent.prototype, "onClick", descriptor),
    ).toThrow(/legacy decorator signature/);
  });
});
