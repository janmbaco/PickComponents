import { test, expect } from "@playwright/test";
import { BindingResolver } from "../../../../src/rendering/bindings/binding-resolver.js";
import { IManagedElementResolver } from "../../../../src/rendering/managed-host/managed-element-resolver.interface.js";
import { ExpressionResolver } from "../../../../src/rendering/bindings/expression-resolver.js";
import { PropertyExtractor } from "../../../../src/rendering/bindings/property-extractor.js";
import { ExpressionParserService } from "../../../../src/rendering/expression-parser/expression-parser.service.js";
import { ASTEvaluator } from "../../../../src/rendering/expression-parser/evaluators/ast.evaluator.js";
import { SafeMethodValidator } from "../../../../src/rendering/expression-parser/safe-methods.js";
import { WeakRefObjectRegistry } from "../../../../src/utils/object-registry.js";
import { DependencyTracker } from "../../../../src/reactive/dependency-tracker.js";
import { JSDOM } from "jsdom";

/**
 * Tests for boolean attribute binding in BindingResolver.
 *
 * Validates that boolean HTML attributes (checked, disabled, selected, etc.)
 * toggle attribute presence and sync DOM properties based on resolved value.
 */
test.describe("BindingResolver Boolean Attributes", () => {
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
  });

  test.afterEach(() => {
    delete (global as any).document;
    delete (global as any).HTMLElement;
    delete (global as any).Element;
    delete (global as any).Node;
    delete (global as any).CustomEvent;
  });

  /**
   * Creates a mock binding target for tests.
   */
  function createMockBindingTarget() {
    return {
      addSubscription: (_subscription: any) => {},
    };
  }

  /**
   * Creates a mock PickComponent with getPropertyObservable.
   */
  function createMockComponent(data: any = {}) {
    return {
      ...data,
      getPropertyObservable: (_prop: string) => ({
        subscribe: (_callback: any) => ({ unsubscribe: () => {} }),
      }),
    };
  }

  /**
   * Creates a BindingResolver with default mocks.
   */
  function createResolver(): BindingResolver {
    const parser = new ExpressionParserService();
    const expressionResolver = new ExpressionResolver(
      parser,
      new ASTEvaluator(new SafeMethodValidator()),
    );
    const mockManagedResolver: IManagedElementResolver = {
      isManagedElement: () => false,
    };
    return new BindingResolver(
      expressionResolver,
      new PropertyExtractor(parser),
      mockManagedResolver,
      new DependencyTracker(),
      new WeakRefObjectRegistry(),
    );
  }

  test.describe("checked attribute", () => {
    test("should set checked attribute when value is true", () => {
      // Arrange
      const resolver = createResolver();
      const input = document.createElement("input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("checked", "{{done}}");
      const component = createMockComponent({ done: true });
      const bindingTarget = createMockBindingTarget();

      // Act
      resolver.bindElement(input, component, bindingTarget);

      // Assert
      expect(input.hasAttribute("checked")).toBe(true);
      expect(input.checked).toBe(true);
    });

    test("should remove checked attribute when value is false", () => {
      // Arrange
      const resolver = createResolver();
      const input = document.createElement("input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("checked", "{{done}}");
      const component = createMockComponent({ done: false });
      const bindingTarget = createMockBindingTarget();

      // Act
      resolver.bindElement(input, component, bindingTarget);

      // Assert
      expect(input.hasAttribute("checked")).toBe(false);
      expect(input.checked).toBe(false);
    });

    test("should toggle checked reactively when state changes", () => {
      // Arrange
      let capturedCallback: (() => void) | null = null;
      const component = {
        done: false,
        getPropertyObservable: (_prop: string) => ({
          subscribe: (cb: () => void) => {
            capturedCallback = cb;
            return { unsubscribe: () => {} };
          },
        }),
      };

      const resolver = createResolver();
      const input = document.createElement("input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("checked", "{{done}}");
      const bindingTarget = createMockBindingTarget();

      // Act — initial bind (false)
      resolver.bindElement(input, component as any, bindingTarget);
      expect(input.hasAttribute("checked")).toBe(false);
      expect(input.checked).toBe(false);

      // Act — change to true
      component.done = true;
      capturedCallback!();

      // Assert
      expect(input.hasAttribute("checked")).toBe(true);
      expect(input.checked).toBe(true);
    });

    test("should handle nested property path like $item.done", () => {
      // Arrange
      const resolver = createResolver();
      const input = document.createElement("input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("checked", "{{$item.done}}");
      const component = createMockComponent({ $item: { done: true } });
      const bindingTarget = createMockBindingTarget();

      // Act
      resolver.bindElement(input, component, bindingTarget);

      // Assert
      expect(input.hasAttribute("checked")).toBe(true);
      expect(input.checked).toBe(true);
    });

    test("should remove checked for nested property path when false", () => {
      // Arrange
      const resolver = createResolver();
      const input = document.createElement("input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("checked", "{{$item.done}}");
      const component = createMockComponent({ $item: { done: false } });
      const bindingTarget = createMockBindingTarget();

      // Act
      resolver.bindElement(input, component, bindingTarget);

      // Assert
      expect(input.hasAttribute("checked")).toBe(false);
      expect(input.checked).toBe(false);
    });
  });

  test.describe("disabled attribute", () => {
    test("should set disabled when value is true", () => {
      // Arrange
      const resolver = createResolver();
      const button = document.createElement("button");
      button.setAttribute("disabled", "{{isDisabled}}");
      const component = createMockComponent({ isDisabled: true });
      const bindingTarget = createMockBindingTarget();

      // Act
      resolver.bindElement(button, component, bindingTarget);

      // Assert
      expect(button.hasAttribute("disabled")).toBe(true);
      expect(button.disabled).toBe(true);
    });

    test("should remove disabled when value is false", () => {
      // Arrange
      const resolver = createResolver();
      const button = document.createElement("button");
      button.setAttribute("disabled", "{{isDisabled}}");
      const component = createMockComponent({ isDisabled: false });
      const bindingTarget = createMockBindingTarget();

      // Act
      resolver.bindElement(button, component, bindingTarget);

      // Assert
      expect(button.hasAttribute("disabled")).toBe(false);
      expect(button.disabled).toBe(false);
    });
  });

  test.describe("selected attribute", () => {
    test("should set selected when value is true", () => {
      // Arrange
      const resolver = createResolver();
      const option = document.createElement("option");
      option.setAttribute("selected", "{{isSelected}}");
      const component = createMockComponent({ isSelected: true });
      const bindingTarget = createMockBindingTarget();

      // Act
      resolver.bindElement(option, component, bindingTarget);

      // Assert
      expect(option.hasAttribute("selected")).toBe(true);
      expect(option.selected).toBe(true);
    });

    test("should remove selected when value is false", () => {
      // Arrange
      const resolver = createResolver();
      const option = document.createElement("option");
      option.setAttribute("selected", "{{isSelected}}");
      const component = createMockComponent({ isSelected: false });
      const bindingTarget = createMockBindingTarget();

      // Act
      resolver.bindElement(option, component, bindingTarget);

      // Assert
      expect(option.hasAttribute("selected")).toBe(false);
      expect(option.selected).toBe(false);
    });
  });

  test.describe("non-boolean attributes remain unchanged", () => {
    test("should set string value for class attribute", () => {
      // Arrange
      const resolver = createResolver();
      const div = document.createElement("div");
      div.setAttribute("class", "{{status}}");
      const component = createMockComponent({ status: "active" });
      const bindingTarget = createMockBindingTarget();

      // Act
      resolver.bindElement(div, component, bindingTarget);

      // Assert
      expect(div.getAttribute("class")).toBe("active");
    });

    test("should NOT toggle attribute for data-* attributes even if value looks boolean", () => {
      // Arrange
      const resolver = createResolver();
      const div = document.createElement("div");
      div.setAttribute("data-active", "{{isActive}}");
      const component = createMockComponent({ isActive: true });
      const bindingTarget = createMockBindingTarget();

      // Act
      resolver.bindElement(div, component, bindingTarget);

      // Assert — data-active stays as string "true", not toggled
      expect(div.hasAttribute("data-active")).toBe(true);
      expect(div.getAttribute("data-active")).toBe("true");
    });
  });

  test.describe("edge cases", () => {
    test("should treat empty string as falsy for checked", () => {
      // Arrange
      const resolver = createResolver();
      const input = document.createElement("input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("checked", "{{value}}");
      const component = createMockComponent({ value: "" });
      const bindingTarget = createMockBindingTarget();

      // Act
      resolver.bindElement(input, component, bindingTarget);

      // Assert
      expect(input.hasAttribute("checked")).toBe(false);
      expect(input.checked).toBe(false);
    });

    test("should treat null as falsy for checked", () => {
      // Arrange
      const resolver = createResolver();
      const input = document.createElement("input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("checked", "{{value}}");
      const component = createMockComponent({ value: null });
      const bindingTarget = createMockBindingTarget();

      // Act
      resolver.bindElement(input, component, bindingTarget);

      // Assert
      expect(input.hasAttribute("checked")).toBe(false);
      expect(input.checked).toBe(false);
    });

    test("should treat undefined as falsy for checked", () => {
      // Arrange
      const resolver = createResolver();
      const input = document.createElement("input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("checked", "{{value}}");
      const component = createMockComponent({ value: undefined });
      const bindingTarget = createMockBindingTarget();

      // Act
      resolver.bindElement(input, component, bindingTarget);

      // Assert
      expect(input.hasAttribute("checked")).toBe(false);
      expect(input.checked).toBe(false);
    });
  });
});
