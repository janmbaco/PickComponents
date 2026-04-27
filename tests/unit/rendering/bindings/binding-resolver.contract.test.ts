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
 * Contract tests for BindingResolver.
 *
 * Validates that BindingResolver:
 * - Uses IManagedElementResolver (not tag name heuristics)
 * - Keeps attributes visible on all elements (objectId for objects, resolved for strings)
 * - Uses managed element status only for recursion control
 */
test.describe("BindingResolver Contract", () => {
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
      getPropertyObservable: (_prop: string) => {
        return {
          subscribe: (_callback: any) => {
            return { unsubscribe: () => {} };
          },
        };
      },
    };
  }

  /**
   * Creates a BindingResolver with the given managed element resolver.
   */
  function createResolver(
    mockResolver: IManagedElementResolver,
    objectRegistry?: WeakRefObjectRegistry,
  ): {
    bindingResolver: BindingResolver;
    objectRegistry: WeakRefObjectRegistry;
  } {
    const parser = new ExpressionParserService();
    const expressionResolver = new ExpressionResolver(
      parser,
      new ASTEvaluator(new SafeMethodValidator()),
    );
    const registry = objectRegistry ?? new WeakRefObjectRegistry();
    const bindingResolver = new BindingResolver(
      expressionResolver,
      new PropertyExtractor(parser),
      mockResolver,
      new DependencyTracker(),
      registry,
    );
    return { bindingResolver, objectRegistry: registry };
  }

  test.describe("IManagedElementResolver dependency", () => {
    test("should use injected managedElementResolver for element detection", () => {
      // Arrange
      let resolverCallCount = 0;
      const mockResolver: IManagedElementResolver = {
        isManagedElement: (_element: Element) => {
          resolverCallCount++;
          return true;
        },
      };

      const { bindingResolver } = createResolver(mockResolver);

      const element = document.createElement("x-test-element");
      element.setAttribute("data-value", "{{items}}");

      const component = createMockComponent({ items: [1, 2, 3] });
      const bindingTarget = createMockBindingTarget();

      // Act
      bindingResolver.bindElement(element, component, bindingTarget);

      // Assert
      expect(resolverCallCount).toBeGreaterThan(0);
    });

    test("should track resolver calls with correct element references", () => {
      // Arrange
      const resolverCalls: Element[] = [];
      const mockResolver: IManagedElementResolver = {
        isManagedElement: (element: Element) => {
          resolverCalls.push(element);
          return true;
        },
      };

      const { bindingResolver } = createResolver(mockResolver);

      const owner = document.createElement("x-owner-element");
      owner.setAttribute("data-value", "{{items}}");

      const component = createMockComponent({ items: [1, 2, 3] });
      const bindingTarget = createMockBindingTarget();

      // Act
      bindingResolver.bindElement(owner, component, bindingTarget);

      // Assert
      expect(resolverCalls).toContain(owner);
    });
  });

  test.describe("object binding produces visible ObjectRegistry ID", () => {
    test("should set attribute to objectId for object values", () => {
      // Arrange
      const mockResolver: IManagedElementResolver = {
        isManagedElement: () => false,
      };

      const { bindingResolver, objectRegistry } = createResolver(mockResolver);

      const element = document.createElement("x-test");
      element.setAttribute("data-value", "{{items}}");

      const component = createMockComponent({ items: [1, 2, 3] });
      const bindingTarget = createMockBindingTarget();

      // Act
      bindingResolver.bindElement(element, component, bindingTarget);

      // Assert — attribute stays visible with objectId value
      expect(element.hasAttribute("data-value")).toBe(true);
      const attrValue = element.getAttribute("data-value")!;
      expect(attrValue).toMatch(/^__obj_/);

      const resolved = objectRegistry.get(attrValue);
      expect(resolved).toEqual([1, 2, 3]);
    });

    test("should set attribute to objectId for managed elements too", () => {
      // Arrange
      const mockResolver: IManagedElementResolver = {
        isManagedElement: () => true,
      };

      const { bindingResolver } = createResolver(mockResolver);

      const element = document.createElement("x-managed");
      element.setAttribute("data-value", "{{items}}");

      const component = createMockComponent({ items: { key: "value" } });
      const bindingTarget = createMockBindingTarget();

      // Act
      bindingResolver.bindElement(element, component, bindingTarget);

      // Assert — attribute stays visible for managed elements too
      expect(element.hasAttribute("data-value")).toBe(true);
      expect(element.getAttribute("data-value")).toMatch(/^__obj_/);
    });
  });

  test.describe("managed element recursion control", () => {
    test("should NOT recurse into managed child elements", () => {
      // Arrange
      const mockResolver: IManagedElementResolver = {
        isManagedElement: (element: Element) => {
          return element.tagName.toLowerCase() === "x-managed-child";
        },
      };

      const { bindingResolver } = createResolver(mockResolver);

      const parent = document.createElement("div");
      const managedChild = document.createElement("x-managed-child");
      managedChild.setAttribute("items", "{{data}}");
      const innerDiv = document.createElement("div");
      innerDiv.setAttribute("title", "{{label}}");
      managedChild.appendChild(innerDiv);
      parent.appendChild(managedChild);

      const component = createMockComponent({ data: [1, 2], label: "test" });
      const bindingTarget = createMockBindingTarget();

      // Act
      bindingResolver.bindElement(parent, component, bindingTarget);

      // Assert — managed child own attributes are bound (objectId set)
      expect(managedChild.getAttribute("items")).toMatch(/^__obj_/);
      // Inner div attrs are NOT bound (recursion stopped at managed child)
      expect(innerDiv.getAttribute("title")).toBe("{{label}}");
    });

    test("should recurse into unmanaged child elements", () => {
      // Arrange
      const mockResolver: IManagedElementResolver = {
        isManagedElement: () => false,
      };

      const { bindingResolver } = createResolver(mockResolver);

      const parent = document.createElement("div");
      const child = document.createElement("div");
      child.setAttribute("title", "{{label}}");
      parent.appendChild(child);

      const component = createMockComponent({ label: "hello" });
      const bindingTarget = createMockBindingTarget();

      // Act
      bindingResolver.bindElement(parent, component, bindingTarget);

      // Assert
      expect(child.getAttribute("title")).toBe("hello");
    });
  });

  test.describe("no tag name heuristics", () => {
    test("should treat all elements equally regardless of tag name pattern", () => {
      // Arrange
      const registeredTags = new Set([
        "my-component",
        "pick-component",
        "x-widget",
      ]);

      const mockResolver: IManagedElementResolver = {
        isManagedElement: (element: Element) => {
          return registeredTags.has(element.tagName.toLowerCase());
        },
      };

      const { bindingResolver } = createResolver(mockResolver);

      const elements = [
        "my-component",
        "pick-component",
        "x-widget",
        "pick-unregistered",
        "regular-div",
      ].map((tag) => {
        const el = document.createElement(tag);
        el.setAttribute("data", "{{value}}");
        return el;
      });

      const component = createMockComponent({ value: [1, 2, 3] });
      const bindingTarget = createMockBindingTarget();

      // Act
      elements.forEach((el) =>
        bindingResolver.bindElement(el, component, bindingTarget),
      );

      // Assert — all elements keep attributes with objectId
      for (const el of elements) {
        expect(el.hasAttribute("data")).toBe(true);
        expect(el.getAttribute("data")).toMatch(/^__obj_/);
      }
    });
  });

  test.describe("reactive updates set new ObjectRegistry ID", () => {
    test("should update attribute to new objectId when component state changes", () => {
      // Arrange
      let capturedCallback: (() => void) | null = null;
      const todos = [{ id: 1, text: "First" }];

      const component = {
        todos,
        getPropertyObservable: (_prop: string) => ({
          subscribe: (cb: () => void) => {
            capturedCallback = cb;
            return { unsubscribe: () => {} };
          },
        }),
      };

      const mockResolver: IManagedElementResolver = {
        isManagedElement: () => false,
      };

      const { bindingResolver, objectRegistry } = createResolver(mockResolver);

      const element = document.createElement("pick-for");
      element.setAttribute("items", "{{todos}}");
      document.body.appendChild(element);

      const bindingTarget = { addSubscription: (_s: any) => {} };

      // Act — initial bind
      bindingResolver.bindElement(element, component as any, bindingTarget);
      const initialId = element.getAttribute("items")!;
      expect(initialId).toMatch(/^__obj_/);

      // Simulate reactive update
      component.todos = [
        { id: 1, text: "First" },
        { id: 2, text: "Second" },
      ];
      capturedCallback!();

      // Assert — attribute updated to new objectId
      const updatedId = element.getAttribute("items")!;
      expect(updatedId).toMatch(/^__obj_/);
      expect(updatedId).not.toBe(initialId);

      const resolved = objectRegistry.get(updatedId);
      expect(resolved).toEqual([
        { id: 1, text: "First" },
        { id: 2, text: "Second" },
      ]);
    });
  });

  test.describe("attribute binding safety", () => {
    test("should remove unsafe dynamic URL attribute values", () => {
      // Arrange
      const mockResolver: IManagedElementResolver = {
        isManagedElement: () => false,
      };
      const { bindingResolver } = createResolver(mockResolver);
      const cases = [
        {
          element: document.createElement("a"),
          attribute: "href",
          value: "javascript:alert(1)",
        },
        {
          element: document.createElement("img"),
          attribute: "src",
          value: "data:text/html,<script>alert(1)</script>",
        },
      ];

      // Act
      for (const unsafeCase of cases) {
        unsafeCase.element.setAttribute(unsafeCase.attribute, "{{url}}");
        const component = createMockComponent({ url: unsafeCase.value });
        bindingResolver.bindElement(
          unsafeCase.element,
          component as any,
          createMockBindingTarget(),
        );
      }

      // Assert
      for (const unsafeCase of cases) {
        expect(unsafeCase.element.hasAttribute(unsafeCase.attribute)).toBe(
          false,
        );
      }
    });

    test("should keep safe dynamic URL attribute values", () => {
      // Arrange
      const mockResolver: IManagedElementResolver = {
        isManagedElement: () => false,
      };
      const { bindingResolver } = createResolver(mockResolver);
      const link = document.createElement("a");
      link.setAttribute("href", "{{path}}");
      const component = createMockComponent({ path: "/account/settings" });

      // Act
      bindingResolver.bindElement(
        link,
        component as any,
        createMockBindingTarget(),
      );

      // Assert
      expect(link.getAttribute("href")).toBe("/account/settings");
    });
  });

  test.describe("nested $item property path resolution (nested pick-for)", () => {
    test("should resolve {{$item.items}} array from outer pick-for scope to objectId", () => {
      // Arrange — simulates the outer pick-for scope: $item = { name: 'Frontend', items: [...] }
      const innerItems = ["HTML", "CSS", "JavaScript"];
      const outerScope = createMockComponent({
        $item: { name: "Frontend", items: innerItems },
      });
      const mockResolver: IManagedElementResolver = {
        isManagedElement: (element: Element) =>
          element.tagName.toLowerCase() === "pick-for",
      };
      const { bindingResolver, objectRegistry } = createResolver(mockResolver);

      const innerFor = document.createElement("pick-for");
      innerFor.setAttribute("items", "{{$item.items}}");
      const bindingTarget = createMockBindingTarget();

      // Act
      bindingResolver.bindElement(innerFor, outerScope as any, bindingTarget);

      // Assert — attribute is an objectId pointing to the actual array
      const attrValue = innerFor.getAttribute("items");
      expect(attrValue).toMatch(/^__obj_/);
      const resolved = objectRegistry.get(attrValue!);
      expect(resolved).toEqual(["HTML", "CSS", "JavaScript"]);
    });

    test("should resolve {{$item.items}} when nested inside a parent element", () => {
      // Arrange — wrapping element simulates the outer pick-for row template
      const innerItems = ["Node.js", "Python", "Go"];
      const outerScope = createMockComponent({
        $item: { name: "Backend", items: innerItems },
      });
      const mockResolver: IManagedElementResolver = {
        isManagedElement: (element: Element) =>
          element.tagName.toLowerCase() === "pick-for",
      };
      const { bindingResolver, objectRegistry } = createResolver(mockResolver);

      const wrapper = document.createElement("div");
      const summary = document.createElement("summary");
      summary.textContent = "{{$item.name}}";
      const innerFor = document.createElement("pick-for");
      innerFor.setAttribute("items", "{{$item.items}}");
      wrapper.appendChild(summary);
      wrapper.appendChild(innerFor);
      const bindingTarget = createMockBindingTarget();

      // Act
      bindingResolver.bindElement(wrapper, outerScope as any, bindingTarget);

      // Assert — inner pick-for gets array via objectId
      const attrValue = innerFor.getAttribute("items");
      expect(attrValue).toMatch(/^__obj_/);
      const resolved = objectRegistry.get(attrValue!);
      expect(resolved).toEqual(["Node.js", "Python", "Go"]);
    });

    test("should not treat {{$item.done}} as an object binding when value is a boolean false", () => {
      // Arrange — $item.done is a primitive boolean, not an array/object
      const outerScope = createMockComponent({ $item: { done: false } });
      const mockResolver: IManagedElementResolver = {
        isManagedElement: () => false,
      };
      const { bindingResolver } = createResolver(mockResolver);

      const input = document.createElement("input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("checked", "{{$item.done}}");
      const bindingTarget = createMockBindingTarget();

      // Act
      bindingResolver.bindElement(input, outerScope as any, bindingTarget);

      // Assert — boolean false removes the attribute (not stored as objectId)
      expect(input.hasAttribute("checked")).toBe(false);
    });

    test("should not treat {{$item.done}} as an object binding when value is boolean true", () => {
      // Arrange
      const outerScope = createMockComponent({ $item: { done: true } });
      const mockResolver: IManagedElementResolver = {
        isManagedElement: () => false,
      };
      const { bindingResolver } = createResolver(mockResolver);

      const input = document.createElement("input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("checked", "{{$item.done}}");
      const bindingTarget = createMockBindingTarget();

      // Act
      bindingResolver.bindElement(input, outerScope as any, bindingTarget);

      // Assert — boolean true sets the attribute to empty string (not objectId)
      expect(input.hasAttribute("checked")).toBe(true);
      expect(input.getAttribute("checked")).not.toMatch(/^__obj_/);
    });
  });
});
