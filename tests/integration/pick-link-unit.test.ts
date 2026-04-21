import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import { TransparentHostFactory } from "../../src/rendering/managed-host/transparent-host.factory.js";
import { Services } from "../../src/providers/service-provider.js";
import type { INavigationService } from "../../src/components/pick-router/navigation-service.interface.js";

/**
 * PickLinkElement extends HTMLElement and must be dynamically imported
 * after JSDOM globals are configured in Node.js test environments.
 */
type PickLinkElementCtor =
  typeof import("../../src/components/pick-link/pick-link-element.js").PickLinkElement;

class MemoryNavigationService implements INavigationService {
  private path = "/";
  private readonly listeners = new Set<() => void>();

  navigate(path: string): void {
    this.path = path;
    for (const listener of [...this.listeners]) {
      listener();
    }
  }

  getCurrentPath(): string {
    return this.path;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

test.describe("PickLinkElement (unit)", () => {
  let dom: JSDOM;
  let document: Document;
  let PickLinkElement: PickLinkElementCtor;

  test.beforeEach(async () => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
      url: "http://localhost/",
    });
    document = dom.window.document;
    (global as any).document = document;
    (global as any).window = dom.window;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).Element = dom.window.Element;
    (global as any).CustomEvent = dom.window.CustomEvent;
    (global as any).MouseEvent = dom.window.MouseEvent;
    (global as any).PopStateEvent = dom.window.PopStateEvent;
    Services.clear();
    Services.register(
      "ITransparentHostFactory" as any,
      new TransparentHostFactory(),
    );
    const navigation =
      await import("../../src/components/pick-router/navigation.js");
    Services.register(
      "INavigationService" as any,
      new navigation.BrowserNavigationService(),
    );

    const mod =
      await import("../../src/components/pick-link/pick-link-element.js");
    PickLinkElement = mod.PickLinkElement;
  });

  test.afterEach(() => {
    delete (global as any).document;
    delete (global as any).window;
    delete (global as any).HTMLElement;
    delete (global as any).Element;
    delete (global as any).CustomEvent;
    delete (global as any).MouseEvent;
    delete (global as any).PopStateEvent;
    Services.clear();
  });

  test("should wrap children in an anchor tag on connect", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/about");
    host.textContent = "About";
    document.body.appendChild(host);

    // Act
    host.connectedCallback();

    // Assert
    const anchor = host.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute("href")).toBe("/about");
    expect(anchor!.textContent).toBe("About");

    host.disconnectedCallback();
  });

  test("should enhance an existing anchor without replacing it", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/docs");

    const existingAnchor = document.createElement("a");
    existingAnchor.setAttribute("href", "/docs");
    existingAnchor.textContent = "Docs";
    host.appendChild(existingAnchor);
    document.body.appendChild(host);

    // Act
    host.connectedCallback();

    // Assert
    const anchor = host.querySelector("a");
    expect(anchor).toBe(existingAnchor);
    expect(anchor!.getAttribute("href")).toBe("/docs");
    expect(anchor!.textContent).toBe("Docs");

    host.disconnectedCallback();
    expect(host.querySelector("a")).toBe(existingAnchor);
  });

  test('should default to "/" when to attribute is missing', async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.textContent = "Home";
    document.body.appendChild(host);

    // Act
    host.connectedCallback();

    // Assert
    const anchor = host.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute("href")).toBe("/");

    host.disconnectedCallback();
  });

  test("should navigate via pushState on click", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/todos");
    host.textContent = "Todos";
    document.body.appendChild(host);
    host.connectedCallback();

    let popstateDispatched = false;
    dom.window.addEventListener("popstate", () => {
      popstateDispatched = true;
    });

    // Act
    const anchor = host.querySelector("a")!;
    const clickEvent = new dom.window.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    anchor.dispatchEvent(clickEvent);

    // Assert
    expect(dom.window.location.pathname).toBe("/todos");
    expect(popstateDispatched).toBe(true);

    host.disconnectedCallback();
  });

  test("should use the registered navigation service for clicks and active state", async () => {
    // Arrange
    Services.clear();
    Services.register(
      "ITransparentHostFactory" as any,
      new TransparentHostFactory(),
    );
    const navigation = new MemoryNavigationService();
    Services.register("INavigationService" as any, navigation);

    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/memory");
    host.textContent = "Memory";
    document.body.appendChild(host);
    host.connectedCallback();

    expect(host.classList.contains("active")).toBe(false);

    // Act
    const anchor = host.querySelector("a")!;
    const clickEvent = new dom.window.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    anchor.dispatchEvent(clickEvent);

    // Assert
    expect(navigation.getCurrentPath()).toBe("/memory");
    expect(host.classList.contains("active")).toBe(true);
    expect(dom.window.location.pathname).toBe("/");

    host.disconnectedCallback();
  });

  test("should not navigate when click is defaultPrevented", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/blocked");
    host.textContent = "Blocked";
    document.body.appendChild(host);
    host.connectedCallback();

    // Act
    const anchor = host.querySelector("a")!;
    const clickEvent = new dom.window.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    clickEvent.preventDefault();
    anchor.dispatchEvent(clickEvent);

    // Assert
    expect(dom.window.location.pathname).toBe("/");

    host.disconnectedCallback();
  });

  test("should not navigate when modifier key is pressed", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/new-tab");
    host.textContent = "New Tab";
    document.body.appendChild(host);
    host.connectedCallback();

    // Act
    const anchor = host.querySelector("a")!;
    const ctrlClick = new dom.window.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    anchor.dispatchEvent(ctrlClick);

    // Assert
    expect(dom.window.location.pathname).toBe("/");

    host.disconnectedCallback();
  });

  test("should not intercept links that target a new browsing context", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/new-window");
    host.textContent = "New window";
    document.body.appendChild(host);
    host.connectedCallback();

    const anchor = host.querySelector("a")!;
    anchor.setAttribute("target", "_blank");

    // Act
    const clickEvent = new dom.window.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    anchor.dispatchEvent(clickEvent);

    // Assert
    expect(clickEvent.defaultPrevented).toBe(false);
    expect(dom.window.location.pathname).toBe("/");

    host.disconnectedCallback();
  });

  test("should clean up listeners on disconnect", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/cleanup");
    host.textContent = "Cleanup";
    document.body.appendChild(host);
    host.connectedCallback();

    // Act
    host.disconnectedCallback();

    // Assert — no errors on second disconnect
    host.disconnectedCallback();
  });

  test("should preserve live child nodes across disconnect and reconnect", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/reactive");

    const textNode = document.createTextNode("Counter");
    host.appendChild(textNode);
    document.body.appendChild(host);

    // Act
    host.connectedCallback();
    const anchorAfterConnect = host.querySelector("a");
    host.disconnectedCallback();

    // Assert
    expect(anchorAfterConnect).not.toBeNull();
    expect(host.firstChild).toBe(textNode);
    expect(host.textContent).toBe("Counter");

    host.connectedCallback();
    const anchorAfterReconnect = host.querySelector("a");
    expect(anchorAfterReconnect?.firstChild).toBe(textNode);

    host.disconnectedCallback();
  });

  test("should set display contents on connect", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/styled");
    host.textContent = "Styled";
    document.body.appendChild(host);

    // Act
    host.connectedCallback();

    // Assert
    expect(host.style.display).toBe("contents");

    host.disconnectedCallback();
  });

  test("should update anchor href when to attribute changes", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/initial");
    host.textContent = "Link";
    document.body.appendChild(host);
    host.connectedCallback();

    // Act
    host.attributeChangedCallback("to", "/initial", "/updated");

    // Assert
    const anchor = host.querySelector("a");
    expect(anchor!.getAttribute("href")).toBe("/updated");

    host.disconnectedCallback();
  });

  test("should navigate to updated path after attribute change", async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/original");
    host.textContent = "Link";
    document.body.appendChild(host);
    host.connectedCallback();
    host.setAttribute("to", "/changed");
    host.attributeChangedCallback("to", "/original", "/changed");

    // Act
    const anchor = host.querySelector("a")!;
    const clickEvent = new dom.window.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    anchor.dispatchEvent(clickEvent);

    // Assert
    expect(dom.window.location.pathname).toBe("/changed");

    host.disconnectedCallback();
  });

  test('should default anchor href to "/" when to attribute is removed', async () => {
    // Arrange
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/about");
    host.textContent = "Link";
    document.body.appendChild(host);
    host.connectedCallback();

    // Act
    host.attributeChangedCallback("to", "/about", null);

    // Assert
    const anchor = host.querySelector("a");
    expect(anchor!.getAttribute("href")).toBe("/");

    host.disconnectedCallback();
  });

  test("should add active class when to matches current path on connect", async () => {
    // Arrange
    dom.reconfigure({ url: "http://localhost/about" });
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/about");
    host.textContent = "About";
    document.body.appendChild(host);

    // Act
    host.connectedCallback();

    // Assert
    expect(host.classList.contains("active")).toBe(true);

    host.disconnectedCallback();
  });

  test("should not add active class when to does not match current path", async () => {
    // Arrange
    dom.reconfigure({ url: "http://localhost/" });
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/about");
    host.textContent = "About";
    document.body.appendChild(host);

    // Act
    host.connectedCallback();

    // Assert
    expect(host.classList.contains("active")).toBe(false);

    host.disconnectedCallback();
  });

  test("should update active class on popstate", async () => {
    // Arrange
    dom.reconfigure({ url: "http://localhost/" });
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/about");
    host.textContent = "About";
    document.body.appendChild(host);
    host.connectedCallback();
    expect(host.classList.contains("active")).toBe(false);

    // Act
    dom.reconfigure({ url: "http://localhost/about" });
    dom.window.dispatchEvent(new dom.window.Event("popstate"));

    // Assert
    expect(host.classList.contains("active")).toBe(true);

    host.disconnectedCallback();
  });

  test("should remove active class when navigating away", async () => {
    // Arrange
    dom.reconfigure({ url: "http://localhost/about" });
    const host = document.createElement(
      "div",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/about");
    host.textContent = "About";
    document.body.appendChild(host);
    host.connectedCallback();
    expect(host.classList.contains("active")).toBe(true);

    // Act
    dom.reconfigure({ url: "http://localhost/other" });
    dom.window.dispatchEvent(new dom.window.Event("popstate"));

    // Assert
    expect(host.classList.contains("active")).toBe(false);

    host.disconnectedCallback();
  });

  test("should place the anchor beside the host under a restrictive list parent", async () => {
    // Arrange
    const list = document.createElement("ul");
    document.body.appendChild(list);
    const host = document.createElement(
      "pick-link",
    ) as unknown as InstanceType<PickLinkElementCtor>;
    Object.setPrototypeOf(host, PickLinkElement.prototype);
    host.setAttribute("to", "/projected");
    host.textContent = "Projected";
    list.appendChild(host);

    // Act
    host.connectedCallback();

    // Assert
    const anchor = list.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute("href")).toBe("/projected");
    expect(host.style.display).toBe("none");

    host.disconnectedCallback();
  });
});
