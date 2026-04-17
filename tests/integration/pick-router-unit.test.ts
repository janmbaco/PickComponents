import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import { Services } from "../../src/providers/service-provider.js";
import { TransparentHostFactory } from "../../src/rendering/managed-host/transparent-host.factory.js";
import type { INavigationService } from "../../src/components/pick-router/navigation-service.interface.js";

/**
 * PickRouterElement extends HTMLElement and must be dynamically imported
 * after JSDOM globals are configured in Node.js test environments.
 */
type PickRouterElementCtor =
  typeof import("../../src/components/pick-router/pick-router-element.js").PickRouterElement;

class MemoryNavigationService implements INavigationService {
  private path: string;
  private readonly listeners = new Set<() => void>();

  constructor(initialPath = "/") {
    this.path = initialPath;
  }

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

test.describe("PickRouterElement (unit)", () => {
  let dom: JSDOM;
  let document: Document;
  let PickRouterElement: PickRouterElementCtor;

  test.beforeEach(async () => {
    // Arrange
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
      url: "http://localhost/",
    });
    document = dom.window.document;
    (global as any).document = document;
    (global as any).window = dom.window;
    (global as any).Node = dom.window.Node;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).HTMLTemplateElement = dom.window.HTMLTemplateElement;
    (global as any).Element = dom.window.Element;
    (global as any).DocumentFragment = dom.window.DocumentFragment;
    (global as any).CustomEvent = dom.window.CustomEvent;
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
      await import("../../src/components/pick-router/pick-router-element.js");
    PickRouterElement = mod.PickRouterElement;
  });

  test.afterEach(() => {
    // Assert
    Services.clear();
    delete (global as any).document;
    delete (global as any).window;
    delete (global as any).Node;
    delete (global as any).HTMLElement;
    delete (global as any).HTMLTemplateElement;
    delete (global as any).Element;
    delete (global as any).DocumentFragment;
    delete (global as any).CustomEvent;
    delete (global as any).PopStateEvent;
  });

  test("should render the outlet beside the host under a restrictive list parent", async () => {
    // Arrange
    const list = document.createElement("ul");
    document.body.appendChild(list);
    const host = document.createElement(
      "pick-router",
    ) as unknown as InstanceType<PickRouterElementCtor>;
    Object.setPrototypeOf(host, PickRouterElement.prototype);

    const homeTemplate = document.createElement("template");
    homeTemplate.setAttribute("data-route", "/");
    homeTemplate.innerHTML = "<li>Home</li>";
    host.appendChild(homeTemplate);
    list.appendChild(host);

    // Act
    host.connectedCallback();

    // Assert
    const outlet = list.querySelector(".router-outlet");
    expect(outlet).not.toBeNull();
    expect(host.style.display).toBe("none");

    host.disconnectedCallback();
  });

  test("should preserve custom elements and update params in place when the route template stays the same", async () => {
    // Arrange
    dom.reconfigure({ url: "http://localhost/en/playground" });
    const host = document.createElement(
      "pick-router",
    ) as unknown as InstanceType<PickRouterElementCtor>;
    Object.setPrototypeOf(host, PickRouterElement.prototype);

    const routeTemplate = document.createElement("template");
    routeTemplate.setAttribute("data-route", "/:lang/playground");
    routeTemplate.innerHTML = `
      <section>
        <route-probe locale=":lang"></route-probe>
      </section>
    `;
    host.appendChild(routeTemplate);
    document.body.appendChild(host);

    // Act
    host.connectedCallback();

    const probeBefore = host.querySelector("route-probe");
    expect(probeBefore).not.toBeNull();
    expect(probeBefore?.getAttribute("locale")).toBe("en");
    expect(host.routeParams).toEqual({ lang: "en" });

    dom.window.history.pushState({}, "", "/es/playground");
    dom.window.dispatchEvent(new dom.window.PopStateEvent("popstate"));

    // Assert
    const probeAfter = host.querySelector("route-probe");
    expect(probeAfter).toBe(probeBefore);
    expect(probeAfter?.getAttribute("locale")).toBe("es");
    expect(host.routeParams).toEqual({ lang: "es" });

    host.disconnectedCallback();
  });

  test("should render and update routes through the registered navigation service", async () => {
    // Arrange
    Services.clear();
    Services.register(
      "ITransparentHostFactory" as any,
      new TransparentHostFactory(),
    );
    const navigation = new MemoryNavigationService("/external/one");
    Services.register("INavigationService" as any, navigation);

    const host = document.createElement(
      "pick-router",
    ) as unknown as InstanceType<PickRouterElementCtor>;
    Object.setPrototypeOf(host, PickRouterElement.prototype);

    const routeTemplate = document.createElement("template");
    routeTemplate.setAttribute("data-route", "/external/:id");
    routeTemplate.innerHTML = `
      <section>
        <route-probe data-id=":id"></route-probe>
      </section>
    `;
    host.appendChild(routeTemplate);
    document.body.appendChild(host);

    // Act
    host.connectedCallback();

    const probeBefore = host.querySelector("route-probe");
    expect(probeBefore).not.toBeNull();
    expect(probeBefore?.getAttribute("data-id")).toBe("one");

    navigation.navigate("/external/two");

    // Assert
    const probeAfter = host.querySelector("route-probe");
    expect(probeAfter).toBe(probeBefore);
    expect(probeAfter?.getAttribute("data-id")).toBe("two");
    expect(host.routeParams).toEqual({ id: "two" });
    expect(dom.window.location.pathname).toBe("/");

    host.disconnectedCallback();
  });

  test("should keep nested pick-router templates dynamic when rendering parent route params", async () => {
    // Arrange
    dom.reconfigure({ url: "http://localhost/en/01-hello" });
    const host = document.createElement(
      "pick-router",
    ) as unknown as InstanceType<PickRouterElementCtor>;
    Object.setPrototypeOf(host, PickRouterElement.prototype);

    const routeTemplate = document.createElement("template");
    routeTemplate.setAttribute("data-route", "/:lang/**");
    routeTemplate.innerHTML = `
      <pick-router>
        <template data-route="/:lang/01-hello">
          <code-playground locale=":lang"></code-playground>
        </template>
      </pick-router>
    `;
    host.appendChild(routeTemplate);
    document.body.appendChild(host);

    // Act
    host.connectedCallback();

    // Assert
    const nestedTemplate = host.querySelector(
      "pick-router template[data-route]",
    ) as HTMLTemplateElement | null;
    expect(nestedTemplate).not.toBeNull();
    expect(nestedTemplate?.getAttribute("data-route")).toBe("/:lang/01-hello");
    expect(
      nestedTemplate?.content.querySelector("code-playground")?.getAttribute(
        "locale",
      ),
    ).toBe(":lang");

    host.disconnectedCallback();
  });

  test("should emit route-change when wildcard path changes inside the same template", async () => {
    // Arrange
    dom.reconfigure({ url: "http://localhost/en/01-hello" });
    const host = document.createElement(
      "pick-router",
    ) as unknown as InstanceType<PickRouterElementCtor>;
    Object.setPrototypeOf(host, PickRouterElement.prototype);

    const routeTemplate = document.createElement("template");
    routeTemplate.setAttribute("data-route", "/:lang/**");
    routeTemplate.innerHTML = `
      <section>
        <playground-shell locale=":lang"></playground-shell>
      </section>
    `;
    host.appendChild(routeTemplate);
    document.body.appendChild(host);

    const paths: string[] = [];
    host.addEventListener("route-change", (event: Event) => {
      const detail = (event as CustomEvent<{ path: string }>).detail;
      paths.push(detail?.path ?? "");
    });

    // Act
    host.connectedCallback();
    const shellBefore = host.querySelector("playground-shell");

    dom.window.history.pushState({}, "", "/en/02-counter");
    dom.window.dispatchEvent(new dom.window.PopStateEvent("popstate"));

    // Assert
    const shellAfter = host.querySelector("playground-shell");
    expect(shellAfter).toBe(shellBefore);
    expect(shellAfter?.getAttribute("locale")).toBe("en");
    expect(host.routeParams).toEqual({ lang: "en" });
    expect(paths).toEqual(["/en/01-hello", "/en/02-counter"]);

    host.disconnectedCallback();
  });
});
