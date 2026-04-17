import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";

import { PickComponent } from "../../src/core/pick-component.js";
import { Reactive } from "../../src/decorators/index.js";
import { PickRender } from "../../src/decorators/pick-render.decorator.js";
import { bootstrapFramework } from "../../src/providers/framework-bootstrap.js";
import { Services } from "../../src/providers/service-provider.js";
import { RenderEngine } from "../../src/rendering/render-engine.js";

test.describe("pick-for in restrictive native contexts", () => {
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
    (global as any).requestAnimationFrame = (
      callback: FrameRequestCallback,
    ): number => dom.window.setTimeout(() => callback(0), 0);
    (global as any).cancelAnimationFrame = (id: number): void => {
      dom.window.clearTimeout(id);
    };

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
    delete (global as any).requestAnimationFrame;
    delete (global as any).cancelAnimationFrame;
  });

  test("renders tr rows from pick-for directly inside tbody", async () => {
    @PickRender({
      selector: "table-results-test",
      template: `
        <table>
          <tbody>
            <pick-for items="{{results}}" key="runnerId">
              <tr>
                <td>{{$item.position}}</td>
                <td>{{$item.name}}</td>
              </tr>
            </pick-for>
          </tbody>
        </table>
      `,
    })
    class TableResultsTest extends PickComponent {
      @Reactive accessor results = [
        { runnerId: "ada", position: 1, name: "Ada" },
        { runnerId: "grace", position: 2, name: "Grace" },
      ];
    }

    const component = new TableResultsTest();
    const host = document.createElement("table-results-test");

    await renderEngine.render({
      componentId: "table-results-test",
      component,
      targetRoot,
      hostElement: host,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    const rows = targetRoot.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("Ada");
    expect(rows[1].textContent).toContain("Grace");
  });

  test("updates tbody rows when the bound pick-for items property changes", async () => {
    @PickRender({
      selector: "table-results-update-test",
      template: `
        <table>
          <tbody>
            <pick-for items="{{results}}" key="runnerId">
              <tr>
                <td>{{$item.position}}</td>
                <td>{{$item.name}}</td>
              </tr>
            </pick-for>
          </tbody>
        </table>
      `,
    })
    class TableResultsUpdateTest extends PickComponent {
      @Reactive accessor results = [
        { runnerId: "ada", position: 1, name: "Ada" },
        { runnerId: "grace", position: 2, name: "Grace" },
      ];
    }

    const component = new TableResultsUpdateTest();
    const host = document.createElement("table-results-update-test");

    await renderEngine.render({
      componentId: "table-results-update-test",
      component,
      targetRoot,
      hostElement: host,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(targetRoot.querySelectorAll("tbody tr")).toHaveLength(2);

    component.results = [
      { runnerId: "katherine", position: 1, name: "Katherine" },
    ];
    await new Promise((resolve) => setTimeout(resolve, 20));

    const rows = targetRoot.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Katherine");
    expect(rows[0].textContent).not.toContain("Ada");
  });
});
