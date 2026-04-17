/**
 * Implements the responsibility of rendering repeated content for each item in a collection.
 *
 * @description
 * Pure custom element that captures its projected innerHTML as a template, then
 * renders one instance per item using ITemplateCompiler with reactive PickForItemScope
 * bindings. Supports keyed diffing for efficient DOM updates. Uses
 * `observedAttributes` + `attributeChangedCallback` for reactive updates.
 *
 * Does not use the PickComponent rendering pipeline — no @PickRender decorator,
 * no metadata registration, no RenderEngine, no TemplateProvider, no SkeletonRenderer.
 *
 * Dependencies resolved via Services.get() in connectedCallback:
 * - ITemplateCompiler: compiles per-item templates with reactive bindings
 *
 * @example
 * ```html
 * <pick-for items="{{todos}}" key="id">
 *   <li>{{$item.text}}</li>
 * </pick-for>
 * ```
 */
import { Services } from "../../providers/service-provider.js";
import type { ITransparentHost } from "../../rendering/managed-host/transparent-host.interface.js";
import type { ITransparentHostFactory } from "../../rendering/managed-host/transparent-host-factory.interface.js";
import type { IObjectRegistry } from "../../utils/object-registry.js";
import type { ITemplateCompiler } from "../../rendering/templates/template-compiler.interface.js";
import { PickForItemScope } from "./pick-for-item-scope.js";
import { ItemDomContext } from "./item-dom-context.js";

/**
 * Defines the type for keyed list diffing identifiers.
 */
type KeyType = string | number;

interface RowRecord {
  key: KeyType;
  scope: PickForItemScope;
  nodes: Node[];
  dispose: () => void;
}

export class PickForElement extends HTMLElement {
  private transparentHost: ITransparentHost | null = null;
  private anchor: Comment | null = null;
  private connectionVersion = 0;
  private rows = new Map<KeyType, RowRecord>();
  private renderInFlight: Promise<void> | null = null;
  private renderQueued = false;
  private templateHtml = "";
  private eventListeners: Array<{
    target: EventTarget;
    event: string;
    handler: EventListenerOrEventListenerObject;
  }> = [];
  private pendingRenderFrame: number | null = null;
  private templateCompiler: ITemplateCompiler | null = null;
  private objectRegistry: IObjectRegistry | null = null;

  static get observedAttributes(): string[] {
    return ["items"];
  }

  connectedCallback(): void {
    this.bumpConnectionVersion();
    this.eventListeners = [];
    this.rows = new Map();
    this.renderQueued = false;

    // Cancel any stale rAF scheduled by attributeChangedCallback that fired
    // BEFORE this connectedCallback (Custom Element upgrade order: attribute
    // callbacks fire before connectedCallback). Without this, the rAF triggers
    // a redundant second render whose updateRows re-inserts rows, causing
    // disconnect/reconnect of nested pick-for elements that lose their template.
    if (this.pendingRenderFrame !== null) {
      cancelAnimationFrame(this.pendingRenderFrame);
    }
    this.pendingRenderFrame = null;

    // Preserve templateHtml across reconnections (e.g. when a parent pick-for
    // re-renders and insertBefore moves this element, triggering disconnect
    // followed by reconnect). On first connection templateHtml is "" so we
    // capture from the data attribute or innerHTML; on subsequent connections
    // the previously captured template remains valid.
    if (!this.templateHtml) {
      const preset = this.getAttribute("data-preset-template");
      this.templateHtml = preset ?? this.innerHTML;
      if (preset !== null) {
        this.removeAttribute("data-preset-template");
      }
    }
    this.innerHTML = "";
    this.transparentHost = Services.get<ITransparentHostFactory>(
      "ITransparentHostFactory",
    ).create(this, "pick-for-anchor");
    this.transparentHost.connect();

    this.anchor = this.transparentHost.isTransparent
      ? document.createComment("pick-for-inline-anchor")
      : document.createComment("pick-for-anchor");
    this.transparentHost.insert(this.anchor);

    this.templateCompiler =
      Services.get<ITemplateCompiler>("ITemplateCompiler");
    this.objectRegistry = Services.get<IObjectRegistry>("IObjectRegistry");

    this.requestRender();
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name === "items" && oldValue !== newValue) {
      this.scheduleRender();
    }
  }

  disconnectedCallback(): void {
    this.bumpConnectionVersion();
    if (this.pendingRenderFrame !== null) {
      cancelAnimationFrame(this.pendingRenderFrame);
      this.pendingRenderFrame = null;
    }
    this.eventListeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    this.eventListeners = [];
    this.renderInFlight = null;
    this.renderQueued = false;
    this.disposeAllRows();
    this.anchor?.parentNode?.removeChild(this.anchor);
    this.anchor = null;
    this.transparentHost?.disconnect();
    this.transparentHost = null;
    this.templateCompiler = null;
    this.objectRegistry = null;
  }

  private bumpConnectionVersion(): void {
    this.connectionVersion = Number.isFinite(this.connectionVersion)
      ? this.connectionVersion + 1
      : 1;
  }

  /**
   * Schedules a render pass on the next animation frame.
   *
   * @description
   * Batches multiple attribute changes into a single render.
   * If a frame is already pending, it is reused — only the latest state
   * is rendered.
   */
  private scheduleRender(): void {
    if (this.pendingRenderFrame !== null) {
      return;
    }

    this.pendingRenderFrame = requestAnimationFrame(() => {
      this.pendingRenderFrame = null;
      this.requestRender();
    });
  }

  private requestRender(): void {
    if (!this.anchor) {
      return;
    }

    if (this.renderInFlight) {
      this.renderQueued = true;
      return;
    }

    const version = this.connectionVersion;
    const renderPromise = this.renderItems(version);
    this.renderInFlight = renderPromise;

    void renderPromise.finally(() => {
      if (this.renderInFlight === renderPromise) {
        this.renderInFlight = null;
      }

      if (!this.renderQueued || version !== this.connectionVersion) {
        return;
      }

      this.renderQueued = false;
      this.requestRender();
    });
  }

  private async renderItems(version = this.connectionVersion): Promise<void> {
    if (!this.anchor || version !== this.connectionVersion) {
      return;
    }

    const items = this.resolveItems();
    const keyAttribute = this.getAttribute("key");
    await this.updateRows(items, keyAttribute);
  }

  /**
   * Updates rows using keyed diffing. When no key attribute is provided,
   * falls back to array index as key — existing rows at the same index
   * get their scope updated reactively instead of being destroyed and recreated.
   *
   * @param items - Current array of items to render
   * @param keyAttribute - Optional key attribute name for stable identity
   */
  private async updateRows(
    items: unknown[],
    keyAttribute: string | null,
  ): Promise<void> {
    const version = this.connectionVersion;
    const nextKeys: KeyType[] = [];
    const nextRows: RowRecord[] = [];

    for (let index = 0; index < items.length; index++) {
      if (version !== this.connectionVersion) {
        return;
      }

      const item = items[index];
      const key = keyAttribute
        ? this.resolveKey(item, index, keyAttribute)
        : index;
      nextKeys.push(key);
      const existing = this.rows.get(key);
      if (existing) {
        existing.scope.setContext({
          item,
          index,
          key,
          count: items.length,
        });
        nextRows.push(existing);
      } else {
        if (!this.templateCompiler) {
          return;
        }
        const row = await this.createRow(
          item,
          index,
          items.length,
          key,
          version,
        );
        if (!row || version !== this.connectionVersion) {
          return;
        }
        nextRows.push(row);
      }
    }

    if (version !== this.connectionVersion) {
      return;
    }

    for (const [key, row] of this.rows) {
      if (!nextKeys.includes(key)) {
        this.removeRow(row);
      }
    }

    this.rows.clear();

    const insertBefore: ChildNode | null = this.anchor;
    nextRows.forEach((row) => {
      row.nodes.forEach((node) => {
        this.transparentHost?.insert(node, insertBefore);
      });
      this.rows.set(row.key, row);
    });
  }

  private async createRow(
    item: unknown,
    index: number,
    count: number,
    key: KeyType,
    version: number,
  ): Promise<RowRecord | null> {
    const scope = new PickForItemScope();
    scope.setContext({ item, index, key, count });

    const domContext = new ItemDomContext(this);
    const element = await this.templateCompiler!.compile(
      this.templateHtml || "<div></div>",
      scope,
      domContext,
    );

    if (version !== this.connectionVersion) {
      domContext.destroy();
      return null;
    }

    domContext.setElement(element);

    const nodes: Node[] = [element];

    const dispose = (): void => {
      domContext.destroy();
    };

    return { key, scope, nodes, dispose };
  }

  private removeRow(row: RowRecord): void {
    row.nodes.forEach((node) => {
      if (node.parentNode === this) {
        this.removeChild(node);
      } else if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
    row.dispose();
  }

  private disposeAllRows(): void {
    for (const row of this.rows.values()) {
      row.nodes.forEach((node) => {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      });
      row.dispose();
    }
    this.rows.clear();
  }

  private resolveItems(): unknown[] {
    const attrValue = this.getAttribute("items");
    if (!attrValue) {
      return [];
    }

    const value = this.objectRegistry!.get<unknown>(attrValue);
    if (Array.isArray(value)) {
      return value;
    }

    return [];
  }

  private resolveKey(item: unknown, index: number, keyAttr: string): KeyType {
    if (item && typeof item === "object" && keyAttr in item) {
      const record = item as Record<string, unknown>;
      const candidate = record[keyAttr];
      if (typeof candidate === "string" || typeof candidate === "number") {
        return candidate;
      }
    }

    return index;
  }
}
