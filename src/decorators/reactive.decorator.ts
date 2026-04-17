import { Services } from "../providers/service-provider.js";
import type { IDependencyTracker } from "../reactive/dependency-tracker.interface.js";
import type { DecoratorMode } from "../providers/framework-bootstrap.js";

type ObservableNotifier = { notify(): void };
type ReactiveHost = {
  getPropertyObservable?: (propName: string) => ObservableNotifier;
};

const legacyReactiveProperties = new WeakMap<object, Set<string | symbol>>();

function registerLegacyReactiveProperty(
  target: object,
  propertyName: string | symbol,
): void {
  const existing = legacyReactiveProperties.get(target);
  if (existing) {
    existing.add(propertyName);
    return;
  }

  legacyReactiveProperties.set(target, new Set([propertyName]));
}

function installReactiveOwnAccessor<T extends object, V>(
  instance: T & ReactiveHost,
  propertyName: string,
  initialValue: V,
): void {
  let value = initialValue;

  Object.defineProperty(instance, propertyName, {
    get(this: T & ReactiveHost): V {
      Services.get<IDependencyTracker>("IDependencyTracker").trackAccess(
        propertyName,
      );
      return value;
    },
    set(this: T & ReactiveHost, nextValue: V): void {
      if (value !== nextValue) {
        value = nextValue;
        if (typeof this.getPropertyObservable === "function") {
          this.getPropertyObservable(propertyName).notify();
        }
      }
    },
    enumerable: true,
    configurable: true,
  });
}

/**
 * Rehydrates legacy decorator fields that were shadowed by modern class-field
 * emit. This lets `@Reactive count = 0` keep working when a consumer project
 * uses `experimentalDecorators: true` without requiring TS config changes.
 */
export function ensureReactiveProperties(instance: object): void {
  let proto = Object.getPrototypeOf(instance) as object | null;

  while (proto && proto !== Object.prototype) {
    const propertyNames = legacyReactiveProperties.get(proto);
    if (propertyNames) {
      for (const propertyName of propertyNames) {
        if (!Object.prototype.hasOwnProperty.call(instance, propertyName)) {
          continue;
        }

        const descriptor = Object.getOwnPropertyDescriptor(proto, propertyName);
        if (
          !descriptor ||
          typeof descriptor.get !== "function" ||
          typeof descriptor.set !== "function"
        ) {
          continue;
        }

        const currentValue = Reflect.get(instance, propertyName);
        if (
          delete (instance as Record<string | symbol, unknown>)[propertyName]
        ) {
          Reflect.set(instance, propertyName, currentValue);
        }
      }
    }

    proto = Object.getPrototypeOf(proto) as object | null;
  }
}

/**
 * @Reactive decorator for renderable component state.
 *
 * @description
 * Marks a property as reactive — automatically triggers a property-specific signal when changed.
 * Only notifies subscribers listening to THIS specific property, avoiding unnecessary updates.
 *
 * Supports two TC39 Stage 3 decorator forms:
 * - **Field form** (`@Reactive count = 0`): preferred public API, installs a
 *   per-instance getter/setter after the field value has been initialized.
 * - **Accessor form** (`@Reactive accessor count = 0`): supported for users
 *   who prefer TC39 auto-accessors.
 *
 * Additionally supports legacy `experimentalDecorators` in the default
 * `{ decorators: 'auto' }` mode. In explicit `'strict'` mode, legacy usage
 * throws an error.
 *
 * Both TC39 forms produce identical reactive behaviour.
 *
 * @architecture
 * - Captures property name from decorator context
 * - On property change: calls `component.getPropertyObservable(propName).notify()`
 * - On property read: calls `IDependencyTracker.trackAccess(propName)` so computed getters
 *   can discover dependencies
 * - RenderEngine subscribes to specific properties used in template bindings
 * - Result: `{{count}}` only updates when `count` changes, not when other properties change
 *
 * @example
 * ```typescript
 * class MyComponent extends PickComponent {
 *   // Field form (recommended):
 *   @Reactive count = 0;
 *
 *   // Accessor form (also supported):
 *   @Reactive accessor items: string[] = [];
 *
 *   increment() {
 *     this.count++; // Only triggers 'count' signal
 *   }
 * }
 * ```
 */
// Overload: accessor form — @Reactive accessor prop = value
export function Reactive<T extends object, V>(
  target: ClassAccessorDecoratorTarget<T, V>,
  context: ClassAccessorDecoratorContext<T, V>,
): ClassAccessorDecoratorResult<T, V> | void;
// Overload: field form — @Reactive prop = value (no accessor keyword)
export function Reactive<T extends object, V>(
  target: undefined,
  context: ClassFieldDecoratorContext<T, V>,
): ((initialValue: V) => V) | void;
// Overload: legacy form — experimentalDecorators (string/symbol context)
export function Reactive(
  target: object | undefined,
  context: string | symbol,
): void;
// Implementation
export function Reactive<T extends object, V>(
  target: ClassAccessorDecoratorTarget<T, V> | object | undefined,
  context:
    | ClassAccessorDecoratorContext<T, V>
    | ClassFieldDecoratorContext<T, V>
    | string
    | symbol,
): ClassAccessorDecoratorResult<T, V> | ((initialValue: V) => V) | void {
  // ── Legacy detection ──────────────────────────────────────────────────────
  // Under `experimentalDecorators: true` the second argument is a string or
  // symbol (the property key), not a TC39 DecoratorContext object.
  if (typeof context === "string" || typeof context === "symbol") {
    const mode = Services.has("IDecoratorMode")
      ? Services.get<DecoratorMode>("IDecoratorMode")
      : "strict";

    if (mode === "strict") {
      throw new Error(
        `[Pick Components] @Reactive was called with a legacy decorator signature on property ` +
          `"${String(context)}". ` +
          `Strict decorator mode only accepts TC39 Stage 3 decorators ` +
          `(TypeScript 5.0+ with experimentalDecorators: false). ` +
          `Use bootstrapFramework(Services) for automatic compatibility, or ` +
          `bootstrapFramework(Services, {}, { decorators: 'auto' }) explicitly.`,
      );
    }

    // auto mode — install reactive getter/setter via Object.defineProperty on prototype.
    // If modern class-field emit shadows this accessor with an own data property,
    // PickElementFactory/RenderEngine call ensureReactiveProperties() after construction.
    const propertyName = String(context);
    const proto = target as Record<string | symbol, unknown>;
    const backingKey = Symbol(`__reactive_${propertyName}`);
    registerLegacyReactiveProperty(proto, context);

    Object.defineProperty(proto, propertyName, {
      get(this: T & ReactiveHost): V {
        Services.get<IDependencyTracker>("IDependencyTracker").trackAccess(
          propertyName,
        );
        return (this as unknown as Record<symbol, V>)[backingKey];
      },
      set(this: T & ReactiveHost, value: V): void {
        const backing = this as unknown as Record<symbol, V>;
        const oldValue = backing[backingKey];
        if (oldValue !== value) {
          backing[backingKey] = value;
          if (typeof this.getPropertyObservable === "function") {
            this.getPropertyObservable(propertyName).notify();
          }
        }
      },
      enumerable: true,
      configurable: true,
    });
    return;
  }

  // ── TC39 Stage 3 ─────────────────────────────────────────────────────────
  const tc39Context = context as
    | ClassAccessorDecoratorContext<T, V>
    | ClassFieldDecoratorContext<T, V>;
  const propertyName = String(tc39Context.name);

  if (tc39Context.kind === "accessor") {
    const accessorTarget = target as ClassAccessorDecoratorTarget<T, V>;
    return {
      get(this: T & ReactiveHost): V {
        Services.get<IDependencyTracker>("IDependencyTracker").trackAccess(
          propertyName,
        );
        return accessorTarget.get.call(this);
      },
      set(this: T & ReactiveHost, value: V): void {
        const oldValue = accessorTarget.get.call(this);
        if (oldValue !== value) {
          accessorTarget.set.call(this, value);
          if (typeof this.getPropertyObservable === "function") {
            this.getPropertyObservable(propertyName).notify();
          }
        }
      },
    };
  }

  // ClassFieldDecoratorContext — field form without `accessor`.
  // The extra initializer runs after the class field has assigned its value, so
  // it can safely replace the own data property with a reactive accessor without
  // being overwritten by modern class-field emit.
  tc39Context.addInitializer(function (this: T & ReactiveHost) {
    installReactiveOwnAccessor(
      this,
      propertyName,
      Reflect.get(this, propertyName) as V,
    );
  });
}
