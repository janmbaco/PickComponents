import { Services } from "../providers/service-provider.js";
import type { DecoratorMode } from "../providers/framework-bootstrap.js";
import type { IListenerMetadataRegistry } from "./listen/listener-metadata-registry.interface.js";

/**
 * Defines the responsibility of storing listener metadata registered by @Listen decorator.
 *
 * @example
 * ```typescript
 * const metadata: ListenerMetadata = {
 *   methodName: 'onClick',
 *   eventName: 'click',
 *   selector: null
 * };
 * ```
 */
export interface ListenerMetadata {
  /** The method name to be called when event fires */
  methodName: string;
  /** The DOM event name (e.g., 'click', 'input', 'keydown') */
  eventName: string;
  /** CSS selector for event delegation (null = root element when omitted) */
  selector: string | null;
}

type ListenTc39Decorator = (
  value: (...args: never[]) => unknown,
  context: ClassMethodDecoratorContext,
) => void;

type ListenLegacyDecorator = (
  target: object,
  propertyKey: string | symbol,
  descriptor?: PropertyDescriptor,
) => void;

function getDecoratorMode(): DecoratorMode {
  return Services.has("IDecoratorMode")
    ? Services.get<DecoratorMode>("IDecoratorMode")
    : "strict";
}

function getListenerMetadataRegistry(): IListenerMetadataRegistry {
  if (!Services.has("IListenerMetadataRegistry")) {
    throw new Error(
      `[Pick Components] @Listen requires framework services. ` +
        `Call bootstrapFramework(Services) before importing or defining components ` +
        `that use @Listen. Missing service: 'IListenerMetadataRegistry'.`,
    );
  }

  return Services.get<IListenerMetadataRegistry>("IListenerMetadataRegistry");
}

function registerListenerMetadata(
  prototype: unknown,
  metadata: ListenerMetadata,
): void {
  getListenerMetadataRegistry().register(prototype, metadata);
}

function assertLegacyDecoratorAllowed(methodName: string): void {
  const mode = getDecoratorMode();
  if (mode === "strict") {
    throw new Error(
      `[Pick Components] @Listen was called with a legacy decorator signature on method ` +
        `"${methodName}". ` +
        `Strict decorator mode only accepts TC39 Stage 3 decorators ` +
        `(TypeScript 5.0+ with experimentalDecorators: false). ` +
        `Use bootstrapFramework(Services) for automatic compatibility, or ` +
        `bootstrapFramework(Services, {}, { decorators: 'auto' }) explicitly.`,
    );
  }
}

/**
 * @Listen decorator - Registers event listeners for component methods.
 *
 * @description
 * Declarative event binding that stores metadata without touching DOM.
 * Actual listener binding happens after render via `IListenerInitializer`.
 * Supports both root element binding and selector-based delegation.
 *
 * Supports both TC39 Stage 3 decorators and legacy `experimentalDecorators`
 * in the default `{ decorators: 'auto' }` bootstrap mode.
 *
 * **Overloads:**
 * - `@Listen('click')` - Binds to root element
 * - `@Listen('.btn', 'click')` - Binds to selector (delegation)
 * - `@Listen({ selector: '.btn' }, 'click')` - Explicit selector object
 *
 * @param selectorOrEvent - CSS selector string, config object, or event name
 * @param eventName - Event name (when first param is selector)
 * @returns Method decorator
 *
 * @throws Error if event name is not provided
 *
 * @example
 * ```typescript
 * class MyComponent extends PickComponent {
 *   // Bind to root element
 *   @Listen('click')
 *   onClick(event: Event) {
 *     console.log('Root clicked');
 *   }
 *
 *   // Bind with selector (delegation)
 *   @Listen('.submit-btn', 'click')
 *   onSubmit(event: Event) {
 *     console.log('Button clicked');
 *   }
 *
 *   // Alternative selector syntax
 *   @Listen({ selector: 'input' }, 'input')
 *   onInput(event: Event) {
 *     console.log('Input changed');
 *   }
 * }
 * ```
 */
export function Listen(
  selectorOrEvent: string | { selector: string },
  eventName?: string,
): ListenTc39Decorator & ListenLegacyDecorator {
  let finalSelector: string | null = null;
  let finalEventName: string;

  if (typeof selectorOrEvent === "string" && eventName) {
    finalSelector = selectorOrEvent;
    finalEventName = eventName;
  } else if (typeof selectorOrEvent === "object" && eventName) {
    finalSelector = selectorOrEvent.selector;
    finalEventName = eventName;
  } else if (typeof selectorOrEvent === "string" && !eventName) {
    finalEventName = selectorOrEvent;
  } else {
    throw new Error(
      '@Listen requires event name. Usage: @Listen("click") or @Listen(".btn", "click")',
    );
  }

  return function (...args: unknown[]): void {
    const legacyPropertyKey = args[1];
    if (
      typeof legacyPropertyKey === "string" ||
      typeof legacyPropertyKey === "symbol"
    ) {
      assertLegacyDecoratorAllowed(String(legacyPropertyKey));
      registerListenerMetadata(args[0], {
        methodName: String(legacyPropertyKey),
        eventName: finalEventName,
        selector: finalSelector,
      });
      return;
    }

    const context = args[1] as ClassMethodDecoratorContext;
    context.addInitializer(function (this: unknown): void {
      registerListenerMetadata(Object.getPrototypeOf(this), {
        methodName: String(context.name),
        eventName: finalEventName,
        selector: finalSelector,
      });
    });
  };
}
