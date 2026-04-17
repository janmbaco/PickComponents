import { test, expect } from "@playwright/test";
import ts from "typescript";

import { PickComponent } from "../../../src/core/pick-component.js";
import {
  ensureReactiveProperties,
  Reactive,
} from "../../../src/decorators/reactive.decorator.js";
import { bootstrapFramework } from "../../../src/providers/framework-bootstrap.js";
import { Services } from "../../../src/providers/service-provider.js";

test.describe("@Reactive decorator", () => {
  test.afterEach(() => {
    Services.clear();
  });

  function compileComponent<T extends PickComponent>(
    source: string,
    experimentalDecorators: boolean,
  ): new () => T {
    const output = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        experimentalDecorators,
      },
    }).outputText;

    return new Function(
      "Reactive",
      "PickComponent",
      `${output}; return TestComponent;`,
    )(Reactive, PickComponent) as new () => T;
  }

  test("should make TC39 field decorators reactive without accessor", async () => {
    await bootstrapFramework(Services);

    const Counter = compileComponent<PickComponent & { count: number }>(
      `
        class TestComponent extends PickComponent {
          @Reactive count = 0;
        }
      `,
      false,
    );

    const component = new Counter();
    const descriptor = Object.getOwnPropertyDescriptor(component, "count");
    let notifications = 0;

    component.getPropertyObservable("count").subscribe(() => {
      notifications++;
    });

    component.count = 1;

    expect(descriptor?.get).toBeInstanceOf(Function);
    expect(descriptor?.set).toBeInstanceOf(Function);
    expect(component.count).toBe(1);
    expect(notifications).toBe(1);
  });

  test("should keep TC39 accessor decorators supported", async () => {
    await bootstrapFramework(Services);

    const Counter = compileComponent<PickComponent & { count: number }>(
      `
        class TestComponent extends PickComponent {
          @Reactive accessor count = 0;
        }
      `,
      false,
    );

    const component = new Counter();
    let notifications = 0;

    component.getPropertyObservable("count").subscribe(() => {
      notifications++;
    });

    component.count = 1;

    expect(component.count).toBe(1);
    expect(notifications).toBe(1);
  });

  test("should rehydrate legacy decorator fields shadowed by modern class-field emit", async () => {
    await bootstrapFramework(Services);

    const LegacyCounter = compileComponent<PickComponent & { count: number }>(
      `
        class TestComponent extends PickComponent {
          @Reactive count = 0;
        }
      `,
      true,
    );

    const component = new LegacyCounter();
    expect(Object.prototype.hasOwnProperty.call(component, "count")).toBe(true);
    expect(component.count).toBe(0);

    ensureReactiveProperties(component);
    let notifications = 0;
    component.getPropertyObservable("count").subscribe(() => {
      notifications++;
    });

    component.count = 1;

    expect(Object.prototype.hasOwnProperty.call(component, "count")).toBe(
      false,
    );
    expect(component.count).toBe(1);
    expect(notifications).toBe(1);
  });
});
