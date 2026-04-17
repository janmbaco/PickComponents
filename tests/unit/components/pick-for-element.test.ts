import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import { TransparentHostFactory } from "../../../src/rendering/managed-host/transparent-host.factory.js";
import { WeakRefObjectRegistry } from "../../../src/utils/object-registry.js";
import { Services } from "../../../src/providers/service-provider.js";

type PickForElementCtor =
  typeof import("../../../src/components/pick-for/pick-for-element.js").PickForElement;

test.describe("PickForElement", () => {
  let dom: JSDOM;
  let document: Document;
  let PickForElement: PickForElementCtor;
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let nextRafId: number;
  let cancelledFrames: Set<number>;
  let objectRegistry: WeakRefObjectRegistry;

  test.beforeEach(async () => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    (global as any).document = document;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).Element = dom.window.Element;
    (global as any).CustomEvent = dom.window.CustomEvent;

    rafCallbacks = new Map();
    nextRafId = 1;
    cancelledFrames = new Set();
    (global as any).requestAnimationFrame = (
      callback: FrameRequestCallback,
    ): number => {
      const id = nextRafId++;
      rafCallbacks.set(id, callback);
      return id;
    };
    (global as any).cancelAnimationFrame = (id: number): void => {
      cancelledFrames.add(id);
      rafCallbacks.delete(id);
    };

    objectRegistry = new WeakRefObjectRegistry();
    Services.register("IObjectRegistry" as any, objectRegistry);
    Services.register(
      "ITransparentHostFactory" as any,
      new TransparentHostFactory(),
    );

    const mod =
      await import("../../../src/components/pick-for/pick-for-element.js");
    PickForElement = mod.PickForElement;
  });

  test.afterEach(() => {
    delete (global as any).document;
    delete (global as any).HTMLElement;
    delete (global as any).Element;
    delete (global as any).CustomEvent;
    delete (global as any).requestAnimationFrame;
    delete (global as any).cancelAnimationFrame;
    Services.clear();
  });

  /**
   * Creates a pick-for host with mock template compiler.
   * The mock compiler creates a <div> with the template text for each item.
   */
  function createMockSetup() {
    const host = document.createElement(
      "pick-for",
    ) as unknown as InstanceType<PickForElementCtor>;
    Object.setPrototypeOf(host, PickForElement.prototype);
    host.innerHTML = "<span>row</span>";
    document.body.appendChild(host);

    let compileCalls = 0;
    const mockTemplateCompiler = {
      compile: async (
        templateSource: string,
        _scope: unknown,
        _domContext: unknown,
      ) => {
        compileCalls++;
        const element = document.createElement("div");
        element.textContent = templateSource.trim() || "item";
        return element;
      },
    };

    Services.register("ITemplateCompiler" as any, mockTemplateCompiler);

    return { host, getCompileCalls: () => compileCalls };
  }

  /**
   * Sets items on a host element via ObjectRegistry + setAttribute.
   * Manually calls attributeChangedCallback since JSDOM doesn't auto-trigger
   * it for elements not registered via customElements.define().
   */
  function setItems(host: Element, items: unknown[]): void {
    const objectId = objectRegistry.set(items);
    const oldValue = host.getAttribute("items");
    host.setAttribute("items", objectId);
    (host as any).attributeChangedCallback("items", oldValue, objectId);
  }

  function commentData(parent: ParentNode): string[] {
    return Array.from(parent.childNodes)
      .filter((node) => node.nodeType === 8)
      .map((node) => (node as Comment).data);
  }

  test("should render items on connectedCallback", async () => {
    // Arrange
    const { host } = createMockSetup();
    setItems(host, ["a", "b"]);

    // Act
    host.connectedCallback();
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Assert — anchor comment + 2 row elements
    expect(host.childNodes.length).toBe(3);

    host.disconnectedCallback();
  });

  test("should reuse existing rows when appending items without key attribute", async () => {
    // Arrange
    const { host, getCompileCalls } = createMockSetup();
    setItems(host, ["a", "b"]);
    host.connectedCallback();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const callsAfterInitial = getCompileCalls();

    // Act — append one item, render directly to bypass rAF
    const updatedId = objectRegistry.set(["a", "b", "c"]);
    host.setAttribute("items", updatedId);
    await (host as any).renderItems();

    // Assert — only 1 new compile call (the appended item)
    const callsAfterUpdate = getCompileCalls();
    expect(callsAfterInitial).toBe(2);
    expect(callsAfterUpdate).toBe(3);

    host.disconnectedCallback();
  });

  test("should destroy excess rows when items are removed without key attribute", async () => {
    // Arrange
    const { host } = createMockSetup();
    setItems(host, ["a", "b", "c"]);
    host.connectedCallback();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const nodesBeforeRemove = host.childNodes.length;

    // Act — shrink to 1 item
    const updatedId = objectRegistry.set(["a"]);
    host.setAttribute("items", updatedId);
    await (host as any).renderItems();

    // Assert — anchor comment + 1 row element
    const nodesAfterRemove = host.childNodes.length;
    expect(nodesBeforeRemove).toBe(4);
    expect(nodesAfterRemove).toBe(2);

    host.disconnectedCallback();
  });

  test("should batch multiple input-changed events into a single rAF frame", async () => {
    // Arrange
    const { host } = createMockSetup();
    setItems(host, []);
    host.connectedCallback();
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Act — fire 3 events rapidly before rAF flushes
    setItems(host, ["x"]);
    setItems(host, ["x", "y"]);
    setItems(host, ["x", "y", "z"]);

    // Assert — only 1 pending rAF frame was scheduled (batched)
    expect((host as any).pendingRenderFrame).not.toBeNull();
    expect(rafCallbacks.size).toBe(1);

    host.disconnectedCallback();
  });

  test("should not duplicate rows when a queued render overlaps the initial async render", async () => {
    // Arrange
    const host = document.createElement(
      "pick-for",
    ) as unknown as InstanceType<PickForElementCtor>;
    Object.setPrototypeOf(host, PickForElement.prototype);
    host.innerHTML = "<button>{{$item.label}}</button>";
    host.setAttribute("key", "id");
    document.body.appendChild(host);

    let compileCalls = 0;
    Services.register("ITemplateCompiler" as any, {
      compile: async (
        templateSource: string,
        _scope: unknown,
        _domContext: unknown,
      ) => {
        compileCalls++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        const element = document.createElement("div");
        element.textContent = templateSource.trim();
        return element;
      },
    });

    const items = [
      { id: "properties", label: "Propiedades" },
      { id: "service-types", label: "Tipos de servicio" },
      { id: "roadmap", label: "Pendiente inmediato" },
    ];

    setItems(host, items);

    // Act — initial render starts, then a queued render lands before the first
    // pass has finished creating rows.
    host.connectedCallback();
    setItems(host, items);
    const scheduledFrame = [...rafCallbacks.values()][0];
    expect(scheduledFrame).toBeDefined();
    scheduledFrame?.(0);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert — one anchor comment + exactly 3 rendered rows, not 6.
    expect(host.childNodes.length).toBe(4);
    expect(host.querySelectorAll("div")).toHaveLength(3);
    expect(compileCalls).toBe(3);

    host.disconnectedCallback();
  });

  test("should cancel pending render frame on disconnectedCallback", async () => {
    // Arrange
    const { host } = createMockSetup();
    setItems(host, []);
    host.connectedCallback();
    await new Promise((resolve) => setTimeout(resolve, 10));
    setItems(host, ["a", "b"]);
    expect((host as any).pendingRenderFrame).not.toBeNull();

    // Act
    host.disconnectedCallback();

    // Assert
    expect((host as any).pendingRenderFrame).toBeNull();
    expect(cancelledFrames.size).toBeGreaterThan(0);

    host.disconnectedCallback();
  });

  test("should update context metadata on existing rows when count changes", async () => {
    // Arrange
    const { host } = createMockSetup();
    setItems(host, ["a", "b"]);
    host.connectedCallback();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const rows = (host as any).rows as Map<number, any>;
    const firstRowScope = rows.get(0)?.scope;
    expect(firstRowScope?.$first).toBe(true);
    expect(firstRowScope?.$last).toBe(false);
    expect(firstRowScope?.$count).toBe(2);

    // Act — append item, existing rows at index 0 and 1 get updated metadata
    const updatedId = objectRegistry.set(["a", "b", "c"]);
    host.setAttribute("items", updatedId);
    await (host as any).renderItems();

    // Assert — same scope instance, updated metadata
    const updatedScope = rows.get(0)?.scope;
    expect(updatedScope).toBe(firstRowScope);
    expect(updatedScope?.$count).toBe(3);
    expect(updatedScope?.$last).toBe(false);

    host.disconnectedCallback();
  });

  test("should render last item with $last true after update", async () => {
    // Arrange
    const { host } = createMockSetup();
    setItems(host, ["a", "b"]);
    host.connectedCallback();
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Act — append one item
    const updatedId = objectRegistry.set(["a", "b", "c"]);
    host.setAttribute("items", updatedId);
    await (host as any).renderItems();

    // Assert
    const rows = (host as any).rows as Map<number, any>;
    const lastScope = rows.get(2)?.scope;
    expect(lastScope?.$last).toBe(true);
    expect(lastScope?.$index).toBe(2);
    expect(lastScope?.$even).toBe(true);

    host.disconnectedCallback();
  });

  test("should capture innerHTML as template before clearing", async () => {
    // Arrange
    const { host } = createMockSetup();

    // Act
    host.connectedCallback();

    // Assert — template was captured
    expect((host as any).templateHtml).toBe("<span>row</span>");

    host.disconnectedCallback();
  });

  test("should set display contents on host element", async () => {
    // Arrange
    const { host } = createMockSetup();

    // Act
    host.connectedCallback();

    // Assert
    expect(host.style.display).toBe("contents");

    host.disconnectedCallback();
  });

  test("should cleanup event listeners on disconnectedCallback", async () => {
    // Arrange
    const { host } = createMockSetup();
    host.connectedCallback();

    // Act
    host.disconnectedCallback();

    // Assert
    expect((host as any).eventListeners).toHaveLength(0);

    host.disconnectedCallback();
  });

  test("should use data-preset-template attribute over innerHTML when set before connectedCallback", () => {
    // Arrange — host.innerHTML is "<span>row</span>" from createMockSetup
    const { host } = createMockSetup();
    const preset = "<li>{{$item}}</li>";

    // Act — set data attribute before connecting (simulates TemplateCompiler pre-capture)
    host.setAttribute("data-preset-template", preset);
    host.connectedCallback();

    // Assert — preset takes precedence over innerHTML
    expect((host as any).templateHtml).toBe(preset);

    host.disconnectedCallback();
  });

  test("should remove data-preset-template attribute after connectedCallback", () => {
    // Arrange
    const { host } = createMockSetup();
    host.setAttribute("data-preset-template", "<li>preset</li>");

    // Act
    host.connectedCallback();

    // Assert — attribute consumed and removed
    expect(host.hasAttribute("data-preset-template")).toBe(false);

    host.disconnectedCallback();
  });

  test("should preserve templateHtml across disconnect/reconnect cycles", () => {
    // Arrange
    const { host } = createMockSetup();
    host.setAttribute("data-preset-template", "<li>preset</li>");
    host.connectedCallback();
    const capturedTemplate = (host as any).templateHtml;
    host.disconnectedCallback();

    // Act — reconnect (simulates parent pick-for insertBefore causing disconnect/reconnect)
    host.connectedCallback();

    // Assert — templateHtml is preserved from first connection, not re-captured
    expect((host as any).templateHtml).toBe(capturedTemplate);
    expect((host as any).templateHtml).toBe("<li>preset</li>");

    host.disconnectedCallback();
  });

  test("should cancel stale rAF from attributeChangedCallback in connectedCallback", () => {
    // Arrange — simulate CE upgrade order: attributeChangedCallback fires before connectedCallback
    const { host } = createMockSetup();
    setItems(host, ["a", "b"]);
    // attributeChangedCallback ran → scheduleRender → rAF queued
    expect((host as any).pendingRenderFrame).not.toBeNull();
    const staleFrameId = (host as any).pendingRenderFrame;

    // Act — connectedCallback should cancel the stale rAF
    host.connectedCallback();

    // Assert — stale rAF was cancelled, pendingRenderFrame is null
    expect((host as any).pendingRenderFrame).toBeNull();
    expect(cancelledFrames.has(staleFrameId)).toBe(true);

    host.disconnectedCallback();
  });

  test("should render generated nodes beside the host under a restrictive select parent", async () => {
    // Arrange
    const select = document.createElement("select");
    document.body.appendChild(select);
    const host = document.createElement(
      "pick-for",
    ) as unknown as InstanceType<PickForElementCtor>;
    Object.setPrototypeOf(host, PickForElement.prototype);
    host.innerHTML = "<option>{{$item}}</option>";
    select.appendChild(host);

    Services.register("ITemplateCompiler" as any, {
      compile: async (templateSource: string) => {
        const template = document.createElement("template");
        template.innerHTML = templateSource.trim();
        return template.content.firstElementChild as HTMLElement;
      },
    });
    setItems(host, ["A", "B"]);

    // Act
    host.connectedCallback();
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Assert
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(2);
    expect(options[0].textContent).toBe("{{$item}}");
    expect(host.style.display).toBe("none");
    expect(commentData(select)).toEqual([
      "pick-for-inline-anchor",
      "pick-for-anchor",
    ]);

    host.disconnectedCallback();
    expect(commentData(select)).toEqual([]);
  });
});
