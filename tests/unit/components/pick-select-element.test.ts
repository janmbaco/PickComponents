import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import { Services } from "../../../src/providers/service-provider.js";
import { TransparentHostFactory } from "../../../src/rendering/managed-host/transparent-host.factory.js";

type PickSelectElementCtor =
  typeof import("../../../src/components/pick-select/pick-select-element.js").PickSelectElement;

test.describe("PickSelectElement", () => {
  let dom: JSDOM;
  let document: Document;
  let PickSelectElement: PickSelectElementCtor;

  test.beforeEach(async () => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    (global as any).document = document;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).Element = dom.window.Element;
    (global as any).MutationObserver = dom.window.MutationObserver;
    (global as any).Node = dom.window.Node;

    Services.clear();
    Services.register(
      "ITransparentHostFactory" as any,
      new TransparentHostFactory(),
    );

    const mod =
      await import("../../../src/components/pick-select/pick-select-element.js");
    PickSelectElement = mod.PickSelectElement;
  });

  test.afterEach(() => {
    Services.clear();
    delete (global as any).document;
    delete (global as any).HTMLElement;
    delete (global as any).Element;
    delete (global as any).MutationObserver;
    delete (global as any).Node;
  });

  function setupPickSelect(
    branches: Array<{ condition?: string; html: string }>,
  ) {
    const host = document.createElement(
      "pick-select",
    ) as unknown as InstanceType<PickSelectElementCtor>;
    Object.setPrototypeOf(host, PickSelectElement.prototype);

    for (const branch of branches) {
      if (branch.condition !== undefined) {
        const on = document.createElement("on");
        on.setAttribute("condition", branch.condition);
        on.innerHTML = branch.html;
        host.appendChild(on);
        continue;
      }

      const otherwise = document.createElement("otherwise");
      otherwise.innerHTML = branch.html;
      host.appendChild(otherwise);
    }

    document.body.appendChild(host);
    return host;
  }

  function getOnElements(
    host: InstanceType<PickSelectElementCtor>,
  ): Element[] {
    return (host as any).branches
      .filter((branch: any) => !branch.isDefault)
      .map((branch: any) => branch.conditionElement);
  }

  function commentData(parent: ParentNode): string[] {
    return Array.from(parent.childNodes)
      .filter((node) => node.nodeType === Node.COMMENT_NODE)
      .map((node) => (node as Comment).data);
  }

  test("should show otherwise branches when all on-conditions are false", () => {
    const host = setupPickSelect([
      { condition: "false", html: '<div id="loading">Loading</div>' },
      { condition: "false", html: '<div id="success">OK</div>' },
      { html: '<div id="idle">Idle</div>' },
      { html: '<div id="hint">Hint</div>' },
    ]);

    host.connectedCallback();

    expect(host.querySelector("#idle")).not.toBeNull();
    expect(host.querySelector("#hint")).not.toBeNull();
    expect(host.querySelector("#loading")).toBeNull();
    expect(host.querySelector("#success")).toBeNull();

    host.disconnectedCallback();
  });

  test("should show every matching on-branch in DOM order and hide otherwise", () => {
    const host = setupPickSelect([
      { condition: "true", html: '<div id="readonly">Read only</div>' },
      { condition: "false", html: '<div id="hidden">Hidden</div>' },
      { condition: "true", html: '<div id="success">Saved</div>' },
      { condition: "true", html: '<div id="error">Error</div>' },
      { html: '<div id="default">Default</div>' },
    ]);

    host.connectedCallback();

    expect(host.querySelector("#readonly")).not.toBeNull();
    expect(host.querySelector("#success")).not.toBeNull();
    expect(host.querySelector("#error")).not.toBeNull();
    expect(host.querySelector("#hidden")).toBeNull();
    expect(host.querySelector("#default")).toBeNull();

    const renderedIds = Array.from(host.childNodes)
      .filter((node) => node instanceof dom.window.HTMLElement)
      .map((node) => (node as HTMLElement).id);
    expect(renderedIds).toEqual(["readonly", "success", "error"]);

    host.disconnectedCallback();
  });

  test("should react to condition attribute changes and swap between on branches and otherwise", async () => {
    const host = setupPickSelect([
      { condition: "false", html: '<div id="readonly">Read only</div>' },
      { condition: "false", html: '<div id="success">Saved</div>' },
      { html: '<div id="idle">Idle</div>' },
    ]);
    host.connectedCallback();

    expect(host.querySelector("#idle")).not.toBeNull();

    const onElements = getOnElements(host);

    onElements[0].setAttribute("condition", "true");
    onElements[1].setAttribute("condition", "true");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.querySelector("#readonly")).not.toBeNull();
    expect(host.querySelector("#success")).not.toBeNull();
    expect(host.querySelector("#idle")).toBeNull();

    onElements[0].setAttribute("condition", "false");
    onElements[1].setAttribute("condition", "false");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.querySelector("#idle")).not.toBeNull();
    expect(host.querySelector("#readonly")).toBeNull();
    expect(host.querySelector("#success")).toBeNull();

    host.disconnectedCallback();
  });

  test("should show nothing when all conditions are false and there is no otherwise", () => {
    const host = setupPickSelect([
      { condition: "false", html: '<div id="a">A</div>' },
      { condition: "false", html: '<div id="b">B</div>' },
    ]);

    host.connectedCallback();

    expect(host.querySelector("#a")).toBeNull();
    expect(host.querySelector("#b")).toBeNull();

    host.disconnectedCallback();
  });

  test("should skip redundant DOM operations when the active branch set stays the same", async () => {
    const host = setupPickSelect([
      { condition: "true", html: '<div id="readonly">Read only</div>' },
      { condition: "true", html: '<div id="success">Saved</div>' },
      { html: '<div id="default">Default</div>' },
    ]);
    host.connectedCallback();

    const readonlyNode = host.querySelector("#readonly");
    const successNode = host.querySelector("#success");
    const onElements = getOnElements(host);

    onElements[0].setAttribute("condition", "true");
    onElements[1].setAttribute("condition", "true");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.querySelector("#readonly")).toBe(readonlyNode);
    expect(host.querySelector("#success")).toBe(successNode);

    host.disconnectedCallback();
  });

  test("should remove active branch nodes from DOM on disconnectedCallback", () => {
    const host = setupPickSelect([
      { condition: "true", html: '<div id="active">Active</div>' },
      { condition: "true", html: '<div id="active2">Active 2</div>' },
    ]);
    host.connectedCallback();

    expect(host.querySelector("#active")).not.toBeNull();
    expect(host.querySelector("#active2")).not.toBeNull();

    host.disconnectedCallback();

    expect(host.querySelector("#active")).toBeNull();
    expect(host.querySelector("#active2")).toBeNull();
  });

  test("should preserve branch templates across disconnect and reconnect", () => {
    const host = setupPickSelect([
      { condition: "true", html: '<div id="active">Active</div>' },
      { condition: "true", html: '<div id="also-active">Also Active</div>' },
      { html: '<div id="default">Default</div>' },
    ]);

    host.connectedCallback();
    expect(host.querySelector("#active")).not.toBeNull();
    expect(host.querySelector("#also-active")).not.toBeNull();

    host.disconnectedCallback();
    host.connectedCallback();

    expect(host.querySelector("#active")).not.toBeNull();
    expect(host.querySelector("#also-active")).not.toBeNull();
    expect(host.querySelector("#default")).toBeNull();

    host.disconnectedCallback();
  });

  test("should remove on and otherwise wrapper elements from the host DOM", () => {
    const host = setupPickSelect([
      { condition: "true", html: '<div id="active">Active</div>' },
      { html: '<div id="default">Default</div>' },
    ]);

    host.connectedCallback();

    expect(host.querySelector("on")).toBeNull();
    expect(host.querySelector("otherwise")).toBeNull();

    host.disconnectedCallback();
  });

  test("should render matching branches beside the host under a restrictive select parent", () => {
    // Arrange
    const select = document.createElement("select");
    document.body.appendChild(select);
    const host = setupPickSelect([
      { condition: "true", html: '<option value="a">A</option>' },
      { condition: "true", html: '<option value="b">B</option>' },
      { html: '<option value="z">Z</option>' },
    ]);
    select.appendChild(host);

    // Act
    host.connectedCallback();

    // Assert
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(2);
    expect(options[0].getAttribute("value")).toBe("a");
    expect(options[1].getAttribute("value")).toBe("b");
    expect(host.style.display).toBe("none");
    expect(commentData(select)).toEqual([
      "pick-select-inline-anchor",
      "pick-select-anchor",
    ]);

    host.disconnectedCallback();
    expect(commentData(select)).toEqual([]);
  });
});
