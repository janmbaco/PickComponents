import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import { TransparentHostFactory } from "../../src/rendering/managed-host/transparent-host.factory.js";
import { WeakRefObjectRegistry } from "../../src/utils/object-registry.js";
import { Services } from "../../src/providers/service-provider.js";

/**
 * PickActionElement extends HTMLElement and must be dynamically imported
 * after JSDOM globals are configured in Node.js test environments.
 */
type PickActionElementCtor =
  typeof import("../../src/components/pick-action/pick-action-element.js").PickActionElement;

test.describe("PickActionElement (unit)", () => {
  let dom: JSDOM;
  let document: Document;
  let PickActionElement: PickActionElementCtor;

  let objectRegistry: WeakRefObjectRegistry;

  test.beforeEach(async () => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    (global as any).document = document;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).Element = dom.window.Element;
    (global as any).CustomEvent = dom.window.CustomEvent;
    (global as any).KeyboardEvent = dom.window.KeyboardEvent;
    (global as any).MouseEvent = dom.window.MouseEvent;

    objectRegistry = new WeakRefObjectRegistry();
    Services.register("IObjectRegistry" as any, objectRegistry);
    Services.register(
      "ITransparentHostFactory" as any,
      new TransparentHostFactory(),
    );

    const mod =
      await import("../../src/components/pick-action/pick-action-element.js");
    PickActionElement = mod.PickActionElement;
  });

  test.afterEach(() => {
    delete (global as any).document;
    delete (global as any).HTMLElement;
    delete (global as any).Element;
    delete (global as any).CustomEvent;
    delete (global as any).KeyboardEvent;
    delete (global as any).MouseEvent;
    Services.clear();
  });

  test("should dispatch pick-action with bubbles and composed", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickActionElementCtor>;
    Object.setPrototypeOf(host, PickActionElement.prototype);
    host.setAttribute("action", "increment");
    const valueId = objectRegistry.set(42);
    host.setAttribute("value", valueId);
    host.innerHTML = '<button id="btn">+</button>';
    document.body.appendChild(host);

    let received: CustomEvent | null = null;
    document.addEventListener("pick-action", (e: Event) => {
      received = e as CustomEvent;
    });

    // Act
    host.connectedCallback();
    const button = document.getElementById("btn")!;
    button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    // Assert
    expect(received).not.toBeNull();
    expect(received!.detail.action).toBe("increment");
    expect(received!.detail.name).toBe("increment");
    expect(received!.detail.value).toBe(42);
    expect(received!.detail.bubble).toBe(false);
    expect(received!.bubbles).toBe(true);
    expect(received!.composed).toBe(true);

    host.disconnectedCallback();
  });

  test("should not dispatch when host is disabled", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickActionElementCtor>;
    Object.setPrototypeOf(host, PickActionElement.prototype);
    host.setAttribute("action", "click");
    host.setAttribute("disabled", "");
    host.innerHTML = '<button id="btn">Click</button>';
    document.body.appendChild(host);

    let dispatched = false;
    document.addEventListener("pick-action", () => {
      dispatched = true;
    });

    // Act
    host.connectedCallback();
    host.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    // Assert
    expect(dispatched).toBe(false);

    host.disconnectedCallback();
  });

  test("should not dispatch when clicking disabled child", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickActionElementCtor>;
    Object.setPrototypeOf(host, PickActionElement.prototype);
    host.setAttribute("action", "act");
    host.innerHTML = '<button id="btn" disabled>Click</button>';
    document.body.appendChild(host);

    let dispatched = false;
    document.addEventListener("pick-action", () => {
      dispatched = true;
    });

    // Act
    host.connectedCallback();
    const button = document.getElementById("btn")!;
    button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    // Assert
    expect(dispatched).toBe(false);

    host.disconnectedCallback();
  });

  test("should dispatch on Enter for wrapper without focusable children", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickActionElementCtor>;
    Object.setPrototypeOf(host, PickActionElement.prototype);
    host.setAttribute("action", "enter");
    host.textContent = "Press";
    document.body.appendChild(host);

    let received: CustomEvent | null = null;
    document.addEventListener("pick-action", (e: Event) => {
      received = e as CustomEvent;
    });

    // Act
    host.connectedCallback();
    host.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", { key: "Enter" }),
    );

    // Assert
    expect(received).not.toBeNull();
    expect(received!.detail.action).toBe("enter");
    expect(received!.detail.name).toBe("enter");

    host.disconnectedCallback();
  });

  test("should dispatch on Enter from a non-focusable visual child", async () => {
    // Arrange
    const host = document.createElement(
      "pick-action",
    ) as unknown as InstanceType<PickActionElementCtor>;
    Object.setPrototypeOf(host, PickActionElement.prototype);
    host.setAttribute("action", "openCard");
    host.innerHTML = '<article id="card">Open card</article>';
    document.body.appendChild(host);

    let received: CustomEvent | null = null;
    document.addEventListener("pick-action", (e: Event) => {
      received = e as CustomEvent;
    });

    // Act
    host.connectedCallback();
    const card = document.getElementById("card")!;
    card.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      }),
    );

    // Assert
    expect(card.getAttribute("role")).toBe("button");
    expect(card.getAttribute("tabindex")).toBe("0");
    expect(received).not.toBeNull();
    expect(received!.detail.action).toBe("openCard");
    expect(received!.detail.name).toBe("openCard");

    host.disconnectedCallback();
  });

  test("should not dispatch when action/event attribute is missing", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickActionElementCtor>;
    Object.setPrototypeOf(host, PickActionElement.prototype);
    host.innerHTML = '<button id="btn">Click</button>';
    document.body.appendChild(host);

    let dispatched = false;
    document.addEventListener("pick-action", () => {
      dispatched = true;
    });

    // Act
    host.connectedCallback();
    const button = document.getElementById("btn")!;
    button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    // Assert
    expect(dispatched).toBe(false);

    host.disconnectedCallback();
  });

  test("should dispatch action when event alias is a plain host attribute", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickActionElementCtor>;
    Object.setPrototypeOf(host, PickActionElement.prototype);
    host.setAttribute("event", "decrement");
    host.innerHTML = '<button id="btn">\u2212</button>';
    document.body.appendChild(host);

    let received: CustomEvent | null = null;
    document.addEventListener("pick-action", (e: Event) => {
      received = e as CustomEvent;
    });

    // Act
    host.connectedCallback();
    const button = document.getElementById("btn")!;
    button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    // Assert
    expect(received).not.toBeNull();
    expect(received!.detail.action).toBe("decrement");
    expect(received!.detail.name).toBe("decrement");
    expect(received!.detail.value).toBeUndefined();

    host.disconnectedCallback();
  });

  test("should dispatch action with value when action and value are plain host attributes", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickActionElementCtor>;
    Object.setPrototypeOf(host, PickActionElement.prototype);
    host.setAttribute("action", "setStep");
    host.setAttribute("value", "5");
    host.innerHTML = '<button id="btn">\u00D75</button>';
    document.body.appendChild(host);

    let received: CustomEvent | null = null;
    document.addEventListener("pick-action", (e: Event) => {
      received = e as CustomEvent;
    });

    // Act
    host.connectedCallback();
    const button = document.getElementById("btn")!;
    button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    // Assert
    expect(received).not.toBeNull();
    expect(received!.detail.action).toBe("setStep");
    expect(received!.detail.name).toBe("setStep");
    expect(received!.detail.value).toBe("5");

    host.disconnectedCallback();
  });

  test("should dispatch projected actions under a restrictive list parent", async () => {
    // Arrange
    const list = document.createElement("ul");
    document.body.appendChild(list);
    const host = document.createElement(
      "pick-action",
    ) as unknown as InstanceType<PickActionElementCtor>;
    Object.setPrototypeOf(host, PickActionElement.prototype);
    host.setAttribute("action", "openItem");
    host.innerHTML = '<li id="item">Open</li>';
    list.appendChild(host);

    let received: CustomEvent | null = null;
    document.addEventListener("pick-action", (event: Event) => {
      received = event as CustomEvent;
    });

    // Act
    host.connectedCallback();
    const item = document.getElementById("item")!;
    item.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    // Assert
    expect(received).not.toBeNull();
    expect(received!.detail.action).toBe("openItem");
    expect(received!.detail.name).toBe("openItem");
    expect(host.style.display).toBe("none");

    host.disconnectedCallback();
  });

  test("should preserve live child nodes across reconnects", async () => {
    // Arrange
    const host = document.createElement(
      "pick-action",
    ) as unknown as InstanceType<PickActionElementCtor>;
    Object.setPrototypeOf(host, PickActionElement.prototype);
    host.setAttribute("action", "loadMore");
    host.innerHTML =
      '<button id="btn"><span id="label">Load more</span></button>';
    document.body.appendChild(host);

    // Act
    host.connectedCallback();
    const label = document.getElementById("label") as HTMLSpanElement;
    label.textContent = "Cargar mas";

    // Assert
    expect(document.getElementById("btn")?.textContent).toBe("Cargar mas");

    host.disconnectedCallback();
    host.connectedCallback();

    expect(document.getElementById("btn")?.textContent).toBe("Cargar mas");

    host.disconnectedCallback();
  });

  test("should mark dispatch detail as bubbling when bubble attribute is present", async () => {
    // Arrange
    const host = document.createElement(
      "pick-action",
    ) as unknown as InstanceType<PickActionElementCtor>;
    Object.setPrototypeOf(host, PickActionElement.prototype);
    host.setAttribute("action", "openParent");
    host.setAttribute("bubble", "");
    host.innerHTML = '<button id="btn">Open parent</button>';
    document.body.appendChild(host);

    let received: CustomEvent | null = null;
    document.addEventListener("pick-action", (event: Event) => {
      received = event as CustomEvent;
    });

    // Act
    host.connectedCallback();
    const button = document.getElementById("btn")!;
    button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    // Assert
    expect(received).not.toBeNull();
    expect(received!.detail.action).toBe("openParent");
    expect(received!.detail.bubble).toBe(true);

    host.disconnectedCallback();
  });
});
