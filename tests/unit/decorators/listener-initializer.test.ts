import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";

import { DefaultListenerInitializer } from "../../../src/decorators/listen/listener-initializer.js";
import { DefaultListenerMetadataRegistry } from "../../../src/decorators/listen/listener-metadata-registry.js";
import { Services } from "../../../src/providers/service-provider.js";
import {
  DomContentType,
  type IDomContext,
} from "../../../src/rendering/dom-context/dom-context.interface.js";
import { DomContext } from "../../../src/rendering/dom-context/dom-context.js";

test.describe("DefaultListenerInitializer", () => {
  let dom: JSDOM;
  let document: Document;

  test.beforeEach(() => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    (global as any).document = document;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).Element = dom.window.Element;
    (global as any).Node = dom.window.Node;
    Services.clear();
  });

  test.afterEach(() => {
    Services.clear();
    delete (global as any).document;
    delete (global as any).HTMLElement;
    delete (global as any).Element;
    delete (global as any).Node;
  });

  function registerListener(
    prototype: object,
    selector: string | null,
    eventName = "click",
  ): void {
    const registry = new DefaultListenerMetadataRegistry();
    registry.register(prototype, {
      methodName: "onEvent",
      eventName,
      selector,
    });
    Services.register("IListenerMetadataRegistry" as any, registry);
  }

  function createContext(root: HTMLElement): IDomContext {
    const targetRoot = document.createElement("div");
    document.body.appendChild(targetRoot);

    const domContext = new DomContext(targetRoot);
    domContext.setElement(root, DomContentType.COMPONENT);
    return domContext;
  }

  test("delegates selector listeners to nodes added after initialization", () => {
    class TestComponent {
      count = 0;

      onEvent(): void {
        this.count += 1;
      }
    }

    registerListener(TestComponent.prototype, "#lateButton");
    const component = new TestComponent();
    const root = document.createElement("section");
    const domContext = createContext(root);

    new DefaultListenerInitializer().initialize(domContext, component);

    const button = document.createElement("button");
    button.id = "lateButton";
    root.appendChild(button);
    button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    expect(component.count).toBe(1);
  });

  test("delegated selector listeners use closest matching ancestor", () => {
    class TestComponent {
      count = 0;

      onEvent(): void {
        this.count += 1;
      }
    }

    registerListener(TestComponent.prototype, "#lateButton");
    const component = new TestComponent();
    const root = document.createElement("section");
    const domContext = createContext(root);
    const button = document.createElement("button");
    button.id = "lateButton";
    const label = document.createElement("span");
    button.appendChild(label);
    root.appendChild(button);

    new DefaultListenerInitializer().initialize(domContext, component);
    label.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    expect(component.count).toBe(1);
  });

  test("removes delegated listeners through the DOM context subscription", () => {
    class TestComponent {
      count = 0;

      onEvent(): void {
        this.count += 1;
      }
    }

    registerListener(TestComponent.prototype, "#lateButton");
    const component = new TestComponent();
    const root = document.createElement("section");
    const domContext = createContext(root);
    const button = document.createElement("button");
    button.id = "lateButton";
    root.appendChild(button);

    new DefaultListenerInitializer().initialize(domContext, component);
    domContext.clearSubscriptions();
    button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    expect(component.count).toBe(0);
  });
});
