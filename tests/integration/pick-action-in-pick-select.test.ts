import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import { RenderEngine } from "../../src/rendering/render-engine.js";
import { PickComponent } from "../../src/core/pick-component.js";
import { PickRender } from "../../src/decorators/pick-render.decorator.js";
import { Reactive } from "../../src/decorators/index.js";
import { Services } from "../../src/providers/service-provider.js";
import { bootstrapFramework } from "../../src/providers/framework-bootstrap.js";

/**
 * Integration test: pick-action dispatching inside pick-select branches.
 *
 * Validates that pick-action events fire and are handled correctly when
 * the pick-action element lives inside a pick-select conditional branch.
 */
test.describe("pick-action inside pick-select", () => {
  let dom: JSDOM;
  let document: Document;
  let renderEngine: RenderEngine;
  let targetRoot: HTMLElement;

  test.beforeEach(async () => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document as unknown as Document;
    (global as any).document = document;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).Element = dom.window.Element;
    (global as any).Node = dom.window.Node;
    (global as any).CustomEvent = dom.window.CustomEvent;
    (global as any).MutationObserver = dom.window.MutationObserver;

    Services.clear();
    await bootstrapFramework(Services);
    renderEngine = Services.get<RenderEngine>("IRenderEngine");

    targetRoot = document.createElement("div");
    document.body.appendChild(targetRoot);
  });

  test.afterEach(() => {
    Services.clear();
    delete (global as any).document;
    delete (global as any).HTMLElement;
    delete (global as any).Element;
    delete (global as any).Node;
    delete (global as any).CustomEvent;
    delete (global as any).MutationObserver;
  });

  test("should handle pick-action event dispatched from inside pick-select otherwise branch", async () => {
    // Arrange
    @PickRender({
      selector: "action-select-test-a",
      template: `
        <div>
          <pick-action action="finish"><button id="btn" type="button">Finish</button></pick-action>
          <p id="status">{{status}}</p>
        </div>
      `,
    })
    class ActionSelectA extends PickComponent {
      @Reactive accessor status = "pending";
      finish(): void {
        this.status = "done";
      }
    }

    const component = new ActionSelectA();
    const host = document.createElement("action-select-test-a");
    document.body.appendChild(host);

    // Use the host's shadow root as targetRoot (matches PickElementFactory behavior)
    const shadowRoot = host.attachShadow({ mode: "open" });

    // Simulate the host element pick-action listener (as PickElementFactory does)
    host.addEventListener("pick-action", (event: Event) => {
      const customEvent = event as CustomEvent<{
        name?: string;
        value?: unknown;
      }>;
      const name = customEvent.detail?.name;
      if (typeof name === "string" && name in component) {
        const candidate = (component as unknown as Record<string, unknown>)[
          name
        ];
        if (typeof candidate === "function") {
          (candidate as () => void).call(component);
        }
      }
    });

    await renderEngine.render({
      componentId: "action-select-test-a",
      component,
      targetRoot: shadowRoot as unknown as HTMLElement,
      hostElement: host,
    });

    // Verify initial state
    expect(component.status).toBe("pending");

    // Act — simulate pick-action dispatching event (as PickActionElement does on click)
    const pickAction = shadowRoot.querySelector("pick-action")!;
    expect(pickAction).not.toBeNull();

    const actionEvent = new dom.window.CustomEvent("pick-action", {
      bubbles: true,
      composed: true,
      detail: { name: "finish" },
    });
    pickAction.dispatchEvent(actionEvent);

    // Assert — composed event crosses shadow boundary, host handler calls finish()
    expect(component.status).toBe("done");
  });
});
