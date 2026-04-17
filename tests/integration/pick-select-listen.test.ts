import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";

import { PickComponent } from "../../src/core/pick-component.js";
import { Listen, Reactive } from "../../src/decorators/index.js";
import { PickRender } from "../../src/decorators/pick-render.decorator.js";
import { bootstrapFramework } from "../../src/providers/framework-bootstrap.js";
import { Services } from "../../src/providers/service-provider.js";
import { RenderEngine } from "../../src/rendering/render-engine.js";

test.describe("@Listen with pick-select", () => {
  let dom: JSDOM;
  let document: Document;
  let renderEngine: RenderEngine;
  let targetRoot: HTMLElement;

  test.beforeEach(async () => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    (global as any).window = dom.window;
    (global as any).document = document;
    (global as any).customElements = dom.window.customElements;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).Element = dom.window.Element;
    (global as any).Node = dom.window.Node;
    (global as any).CustomEvent = dom.window.CustomEvent;
    (global as any).MutationObserver = dom.window.MutationObserver;
    (global as any).ShadowRoot = dom.window.ShadowRoot;

    Services.clear();
    await bootstrapFramework(Services, {}, { decorators: "auto" });
    renderEngine = Services.get<RenderEngine>("IRenderEngine");

    targetRoot = document.createElement("div");
    document.body.appendChild(targetRoot);
  });

  test.afterEach(() => {
    Services.clear();
    delete (global as any).window;
    delete (global as any).document;
    delete (global as any).customElements;
    delete (global as any).HTMLElement;
    delete (global as any).Element;
    delete (global as any).Node;
    delete (global as any).CustomEvent;
    delete (global as any).MutationObserver;
    delete (global as any).ShadowRoot;
  });

  test("handles selector listeners for nodes activated after initial render", async () => {
    @PickRender({
      selector: "listen-select-test",
      template: `
        <section>
          <pick-select>
            <on condition="{{enabled}}">
              <button id="lateButton" type="button">Pulsar</button>
            </on>
            <otherwise>
              <span id="idle">Esperando</span>
            </otherwise>
          </pick-select>
          <output id="count">{{count}}</output>
        </section>
      `,
    })
    class ListenSelectTest extends PickComponent {
      @Reactive accessor enabled = false;
      @Reactive accessor count = 0;

      @Listen("#lateButton", "click")
      onLateClick(): void {
        this.count += 1;
      }
    }

    const component = new ListenSelectTest();
    const host = document.createElement("listen-select-test");

    await renderEngine.render({
      componentId: "listen-select-test",
      component,
      targetRoot,
      hostElement: host,
    });

    expect(targetRoot.querySelector("#idle")).not.toBeNull();
    expect(targetRoot.querySelector("#lateButton")).toBeNull();

    component.enabled = true;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const button = targetRoot.querySelector("#lateButton");
    expect(button).not.toBeNull();
    button?.dispatchEvent(
      new dom.window.MouseEvent("click", { bubbles: true, composed: true }),
    );

    expect(component.count).toBe(1);
    expect(targetRoot.querySelector("#count")?.textContent).toBe("1");
  });
});
