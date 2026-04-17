import { test, expect } from "@playwright/test";
import { BindingResolver } from "../../../../src/rendering/bindings/binding-resolver.js";
import { ExpressionResolver } from "../../../../src/rendering/bindings/expression-resolver.js";
import { PropertyExtractor } from "../../../../src/rendering/bindings/property-extractor.js";
import { ExpressionParserService } from "../../../../src/rendering/expression-parser/expression-parser.service.js";
import { ASTEvaluator } from "../../../../src/rendering/expression-parser/evaluators/ast.evaluator.js";
import { SafeMethodValidator } from "../../../../src/rendering/expression-parser/safe-methods.js";
import { DependencyTracker } from "../../../../src/reactive/dependency-tracker.js";
import { WeakRefObjectRegistry } from "../../../../src/utils/object-registry.js";
import { PickComponent } from "../../../../src/core/pick-component.js";
import { Reactive } from "../../../../src/decorators/reactive.decorator.js";
import { IManagedElementResolver } from "../../../../src/rendering/managed-host/managed-element-resolver.interface.js";
import { Unsubscribe } from "../../../../src/reactive/signal.js";
import { Services } from "../../../../src/providers/service-provider.js";
import { JSDOM } from "jsdom";

/**
 * Regression tests for computed getter reactivity.
 *
 * Validates that template bindings using plain getters (e.g. {{icon}})
 * update automatically when the underlying @Reactive property changes.
 * This mirrors the ThemeSwitcher pattern:
 *   @Reactive accessor mode → getter icon → template {{icon}}
 */
test.describe("BindingResolver — Computed Getter Reactivity", () => {
  let dom: JSDOM;
  let document: Document;

  test.beforeEach(() => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    (global as any).document = document;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).Element = dom.window.Element;
    (global as any).Node = dom.window.Node;
    (global as any).CustomEvent = dom.window.CustomEvent;

    Services.register("IDependencyTracker" as any, new DependencyTracker());
  });

  test.afterEach(() => {
    delete (global as any).document;
    delete (global as any).HTMLElement;
    delete (global as any).Element;
    delete (global as any).Node;
    delete (global as any).CustomEvent;
    Services.clear();
  });

  const LABELS: Record<string, string> = {
    auto: "Auto",
    light: "Light",
    dark: "Dark",
  };

  class TestComponent extends PickComponent {
    @Reactive accessor mode: string = "auto";

    get label(): string {
      return LABELS[this.mode] ?? "Unknown";
    }
  }

  function createBindingResolver(): BindingResolver {
    const parser = new ExpressionParserService();
    const mockManagedResolver: IManagedElementResolver = {
      isManagedElement: () => false,
    };
    return new BindingResolver(
      new ExpressionResolver(
        parser,
        new ASTEvaluator(new SafeMethodValidator()),
      ),
      new PropertyExtractor(parser),
      mockManagedResolver,
      Services.get("IDependencyTracker" as any),
      new WeakRefObjectRegistry(),
    );
  }

  function createBindingTarget(): {
    addSubscription(sub: Unsubscribe): void;
    subscriptions: Unsubscribe[];
  } {
    const subscriptions: Unsubscribe[] = [];
    return {
      subscriptions,
      addSubscription(sub: Unsubscribe) {
        subscriptions.push(sub);
      },
    };
  }

  test("should update text node when computed getter dependency changes", () => {
    // Arrange
    const resolver = createBindingResolver();
    const component = new (TestComponent as any)() as TestComponent;
    const target = createBindingTarget();
    const textNode = document.createTextNode("{{label}}");
    const container = document.createElement("div");
    container.appendChild(textNode);

    // Act — bind and verify initial render
    resolver.bindElement(container, component, target);

    // Assert — initial value
    expect(textNode.textContent).toBe("Auto");

    // Act — change the reactive dependency
    component.mode = "dark";

    // Assert — computed getter updated via dependency tracking
    expect(textNode.textContent).toBe("Dark");
  });

  test("should update attribute when computed getter dependency changes", () => {
    // Arrange
    const resolver = createBindingResolver();
    const component = new (TestComponent as any)() as TestComponent;
    const target = createBindingTarget();
    const element = document.createElement("span");
    element.setAttribute("title", "{{label}}");
    const container = document.createElement("div");
    container.appendChild(element);

    // Act — bind and verify initial render
    resolver.bindElement(container, component, target);

    // Assert — initial value
    expect(element.getAttribute("title")).toBe("Auto");

    // Act — change the reactive dependency
    component.mode = "light";

    // Assert — attribute updated
    expect(element.getAttribute("title")).toBe("Light");
  });

  test("should still work for direct @Reactive properties", () => {
    // Arrange
    const resolver = createBindingResolver();
    const component = new (TestComponent as any)() as TestComponent;
    const target = createBindingTarget();
    const textNode = document.createTextNode("{{mode}}");
    const container = document.createElement("div");
    container.appendChild(textNode);

    // Act
    resolver.bindElement(container, component, target);

    // Assert — initial
    expect(textNode.textContent).toBe("auto");

    // Act
    component.mode = "dark";

    // Assert
    expect(textNode.textContent).toBe("dark");
  });

  test("should handle multiple computed getters depending on same reactive property", () => {
    // Arrange
    const ICONS: Record<string, string> = { auto: "⊙", light: "☀", dark: "☾" };

    class MultiGetterComponent extends PickComponent {
      @Reactive accessor mode: string = "auto";

      get label(): string {
        return LABELS[this.mode] ?? "Unknown";
      }

      get icon(): string {
        return ICONS[this.mode] ?? "?";
      }
    }

    const resolver = createBindingResolver();
    const component =
      new (MultiGetterComponent as any)() as MultiGetterComponent;
    const target = createBindingTarget();
    const labelNode = document.createTextNode("{{label}}");
    const iconNode = document.createTextNode("{{icon}}");
    const container = document.createElement("div");
    container.appendChild(labelNode);
    container.appendChild(iconNode);

    // Act
    resolver.bindElement(container, component, target);

    // Assert — initial
    expect(labelNode.textContent).toBe("Auto");
    expect(iconNode.textContent).toBe("⊙");

    // Act
    component.mode = "dark";

    // Assert — both updated
    expect(labelNode.textContent).toBe("Dark");
    expect(iconNode.textContent).toBe("☾");
  });
});
