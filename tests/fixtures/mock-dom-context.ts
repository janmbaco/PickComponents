import type {
  IDomContext,
  DomContentType,
} from "../../src/rendering/dom-context/dom-context.interface.js";
import type { Unsubscribe } from "../../src/reactive/signal.js";

/**
 * Mock implementation of IDomContext for unit testing.
 * Does not require actual DOM, works in pure Node environment.
 *
 * @description
 * Lightweight mock for testing rendering logic without browser dependencies.
 * Tracks method calls for verification in tests.
 */
export class MockDomContext implements IDomContext {
  readonly contextId: string;

  private element: HTMLElement | null = null;
  private contentType: DomContentType;
  public subscriptions: Unsubscribe[] = [];
  private isRendered = false;
  private prependedToRoot: any[] = [];

  // Persistent mock target root with prepend support
  private readonly targetRoot: any = {
    nodeName: "DIV",
    innerHTML: "",
    querySelectorAll: () => [],
    querySelector: () => null,
    appendChild: () => {},
    removeChild: () => {},
    children: [],
    childNodes: [],
    prepend: (...nodes: any[]) => {
      this.prependedToRoot.push(...nodes);
    },
  };

  // Tracking for test assertions
  public methodCalls: Array<{ method: string; args: any[] }> = [];

  constructor(contextId = "mock-ctx-1") {
    this.contextId = contextId;
    this.contentType = "none" as DomContentType;
  }

  getElement(): HTMLElement | null {
    this.methodCalls.push({ method: "getElement", args: [] });
    return this.element;
  }

  setElement(element: HTMLElement, contentType: DomContentType): void {
    this.methodCalls.push({
      method: "setElement",
      args: [element, contentType],
    });
    if (!element) throw new Error("Element is required");
    if (!contentType) throw new Error("Content type is required");

    this.element = element;
    this.contentType = contentType;
    this.isRendered = true;
  }

  getIsRendered(): boolean {
    this.methodCalls.push({ method: "getIsRendered", args: [] });
    return this.isRendered;
  }

  addSubscription(subscription: Unsubscribe): void {
    this.methodCalls.push({ method: "addSubscription", args: [subscription] });
    if (!subscription) throw new Error("Subscription is required");
    this.subscriptions.push(subscription);
  }

  query(selector: string): HTMLElement | null {
    this.methodCalls.push({ method: "query", args: [selector] });
    if (!selector) throw new Error("Selector is required");
    if (!this.element) return null;
    return this.element.querySelector(selector);
  }

  clearSubscriptions(): void {
    this.methodCalls.push({ method: "clearSubscriptions", args: [] });
    this.subscriptions.forEach((fn) => {
      try {
        fn();
      } catch {
        /* intentional no-op */
      }
    });
    this.subscriptions = [];
  }

  createElement(tagName: string): HTMLElement {
    this.methodCalls.push({ method: "createElement", args: [tagName] });
    if (!tagName) throw new Error("Tag name is required");

    // Return mock element
    return {
      tagName: tagName.toUpperCase(),
      innerHTML: "",
      setAttribute: () => {},
      getAttribute: () => null,
      hasAttribute: () => false,
      removeAttribute: () => {},
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false,
      },
    } as any;
  }

  getContentType(): DomContentType {
    this.methodCalls.push({ method: "getContentType", args: [] });
    return this.contentType;
  }

  getTargetRoot(): HTMLElement | ShadowRoot {
    this.methodCalls.push({ method: "getTargetRoot", args: [] });
    return this.targetRoot;
  }

  destroy(): void {
    this.methodCalls.push({ method: "destroy", args: [] });
    this.clearSubscriptions();
    this.element = null;
    this.isRendered = false;
  }

  // Test helpers
  reset(): void {
    this.methodCalls = [];
    this.prependedToRoot = [];
  }

  getPrependedToRoot(): any[] {
    return [...this.prependedToRoot];
  }

  wasMethodCalled(methodName: string): boolean {
    return this.methodCalls.some((call) => call.method === methodName);
  }

  getMethodCallCount(methodName: string): number {
    return this.methodCalls.filter((call) => call.method === methodName).length;
  }
}

/**
 * Factory for creating MockDomContext instances.
 */
export class MockDomContextFactory {
  private static counter = 0;
  private static instances: MockDomContext[] = [];

  static create(): MockDomContext {
    this.counter++;
    const ctx = new MockDomContext(`mock-ctx-${this.counter}`);
    this.instances.push(ctx);
    return ctx;
  }

  static createMultiple(count: number): MockDomContext[] {
    return Array.from({ length: count }, () => this.create());
  }

  static cleanup(): void {
    this.instances.forEach((ctx) => ctx.destroy());
    this.instances = [];
    this.counter = 0;
  }

  static getInstanceCount(): number {
    return this.instances.length;
  }
}
