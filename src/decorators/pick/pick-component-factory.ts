import type { IPickComponentFactory } from "./pick-component-factory.interface.js";
import type { CapturedConfig, InlineContext } from "./types.js";
import { PickComponent } from "../../core/pick-component.js";
import { PickInitializer } from "../../behaviors/pick-initializer.js";
import { PickLifecycleManager } from "../../behaviors/pick-lifecycle-manager.js";
import { IntentSignal } from "../../reactive/signal.js";
import type { IListenerMetadataRegistry } from "../listen/listener-metadata-registry.interface.js";
import { Services } from "../../providers/service-provider.js";
import type {
  DependencyBag,
  DependencyBagFactory,
  ISubscriptionManager,
} from "./types.js";

/**
 * Tracks which state properties are accessed during a computed getter invocation.
 * Set to a `Set<string>` while a getter is being profiled for dependencies; null otherwise.
 */
let activeComputedTracker: Set<string> | null = null;

/**
 * Implements the responsibility of building the dynamic class hierarchy for a `@Pick` component.
 *
 * @description
 * Single composition-root implementation of `IPickComponentFactory`.
 * Contains all dynamic class construction logic for enhanced base class,
 * initializer, and lifecycle manager — previously spread across three utility modules.
 *
 * Registered in the service container under `'IPickComponentFactory'` by
 * `bootstrapFramework`, so the `@Pick` decorator never references concrete construction directly.
 */
export class DefaultPickComponentFactory implements IPickComponentFactory {
  /**
   * Resolves dependencies from a factory, returning a shallow copy or empty object if no factory provided.
   *
   * @param createDeps - Optional factory that creates dependency values for current execution
   * @returns Shallow copy of the dependency bag, or empty object
   * @throws Error if the factory does not return an object
   */
  private resolveDeps(
    createDeps: DependencyBagFactory | undefined,
  ): DependencyBag {
    if (!createDeps) return {};
    const deps = createDeps();
    if (!deps || typeof deps !== "object")
      throw new Error("[DI] createDeps must return an object");
    return { ...deps };
  }

  /**
   * Captures the configuration produced by executing the setup function against an InlineContext.
   *
   * @param setup - Setup function receiving InlineContext
   * @returns Captured configuration object
   * @throws Error if setup is null or undefined
   */
  captureConfig<TState>(
    setup: (ctx: InlineContext<TState>) => void,
  ): CapturedConfig<TState> {
    if (!setup) throw new Error("setup is required");

    const config: CapturedConfig<TState> = {};

    const context: InlineContext<TState> = {
      state(initial: TState) {
        config.state = initial;
      },
      on(
        handlers: Record<
          string,
          (this: PickComponent & TState, ...args: unknown[]) => unknown
        >,
      ) {
        config.methods = handlers;
      },
      intent(name: string) {
        if (!name) {
          throw new Error("[Pick] ctx.intent requires a property name");
        }
        if (!config.intents) {
          config.intents = [];
        }
        if (!config.intents.some((intent) => intent.name === name)) {
          config.intents.push({ name });
        }
      },
      listen(
        selectorOrEventName: string,
        eventNameOrHandler:
          | string
          | ((this: PickComponent & TState, event: Event) => unknown),
        maybeHandler?: (this: PickComponent & TState, event: Event) => unknown,
      ) {
        const selector =
          typeof eventNameOrHandler === "string" ? selectorOrEventName : null;
        const eventName =
          typeof eventNameOrHandler === "string"
            ? eventNameOrHandler
            : selectorOrEventName;
        const handler =
          typeof eventNameOrHandler === "string"
            ? maybeHandler
            : eventNameOrHandler;

        if (!eventName) {
          throw new Error("[Pick] ctx.listen requires an event name");
        }
        if (typeof handler !== "function") {
          throw new Error("[Pick] ctx.listen requires a handler function");
        }

        if (!config.listeners) {
          config.listeners = [];
        }
        config.listeners.push({
          selector,
          eventName,
          handler,
        });
      },
      computed(
        computed: Record<string, (this: PickComponent & TState) => unknown>,
      ) {
        config.computed = computed;
      },
      lifecycle<TDeps extends DependencyBag = DependencyBag>(
        hooks: {
          onInit?: (
            component: PickComponent & TState,
            subs: ISubscriptionManager,
            deps: TDeps | undefined,
          ) => void;
          onDestroy?: (
            component: PickComponent & TState,
            subs: ISubscriptionManager,
            deps: TDeps | undefined,
          ) => void;
        },
        createDeps?: DependencyBagFactory<TDeps>,
      ) {
        config.lifecycle = {
          onInit: hooks.onInit as
            | ((
                component: PickComponent & TState,
                subs: ISubscriptionManager,
                deps: DependencyBag | undefined,
              ) => void)
            | undefined,
          onDestroy: hooks.onDestroy as
            | ((
                component: PickComponent & TState,
                subs: ISubscriptionManager,
                deps: DependencyBag | undefined,
              ) => void)
            | undefined,
          createDeps: createDeps as DependencyBagFactory | undefined,
        };
      },
      rules(rules: Record<string, unknown>) {
        config.rules = rules;
      },
      html(template: string) {
        config.template = template;
      },
      skeleton(template: string) {
        config.skeleton = template;
      },
      errorTemplate(template: string) {
        config.errorTemplate = template;
      },
      css(styles: string) {
        config.styles = styles;
      },
      initializer<TDeps extends DependencyBag = DependencyBag>(
        fn: (component: PickComponent & TState, deps?: TDeps) => Promise<void>,
        createDeps?: DependencyBagFactory<TDeps>,
      ) {
        config.initializer = fn as (
          component: PickComponent & TState,
          deps?: DependencyBag,
        ) => Promise<void>;
        config.initializerCreateDeps = createDeps as
          | DependencyBagFactory
          | undefined;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      props<_TProps = unknown>() {
        config.propsTyped = true;
      },
      ref(name: string) {
        if (!config.refs) {
          config.refs = new Set();
        }
        config.refs.add(name);
      },
    };

    setup(context);
    return config;
  }

  /**
   * Creates the enhanced PickComponent class with reactive state and handlers from the setup config.
   *
   * @param target - Original class decorated by `@Pick`
   * @param config - Captured setup configuration
   * @returns Constructor extending PickComponent
   * @throws Error if target or config is null or undefined
   */
  createEnhancedClass<TState>(
    target: unknown,
    config: CapturedConfig<TState>,
  ): new (...args: unknown[]) => PickComponent {
    if (!target) throw new Error("target is required");
    if (!config) throw new Error("config is required");

    class Enhanced extends PickComponent {
      refs: Record<string, HTMLElement | null> = {};
      props: Record<string, unknown> = {};

      constructor() {
        super();

        if (config.intents) {
          config.intents.forEach(({ name }) => {
            Object.defineProperty(this, name, {
              value: new IntentSignal(),
              enumerable: false,
              configurable: true,
              writable: false,
            });
          });
        }

        if (config.state) {
          Object.keys(config.state).forEach((key) => {
            const initialValue = (config.state as Record<string, unknown>)[key];
            let value = initialValue;

            Object.defineProperty(this, key, {
              get() {
                if (activeComputedTracker) activeComputedTracker.add(key);
                return value;
              },
              set(newValue) {
                if (value !== newValue) {
                  value = newValue;
                  (this as PickComponent).getPropertyObservable(key).notify();
                }
              },
              enumerable: true,
              configurable: true,
            });
          });
        }

        if (config.computed) {
          Object.keys(config.computed).forEach((key) => {
            const getter = (
              config.computed as Record<
                string,
                (this: PickComponent) => unknown
              >
            )[key];
            Object.defineProperty(this, key, {
              get() {
                return getter.call(this);
              },
              enumerable: true,
              configurable: true,
            });

            const deps = new Set<string>();
            activeComputedTracker = deps;
            try {
              getter.call(this);
            } finally {
              activeComputedTracker = null;
            }

            deps.forEach((dep) => {
              (this as PickComponent)
                .getPropertyObservable(dep)
                .subscribe(() => {
                  (this as PickComponent).getPropertyObservable(key).notify();
                });
            });
          });
        }

        if (config.rules) {
          (this as unknown as { rules: Record<string, unknown> }).rules =
            config.rules;
        }
      }
    }

    if (config.methods) {
      Object.defineProperty(Enhanced.prototype, "getViewActions", {
        value() {
          return config.methods;
        },
        writable: true,
        configurable: true,
      });

      Object.keys(config.methods).forEach((key) => {
        (Enhanced.prototype as unknown as Record<string, unknown>)[key] = (
          config.methods as Record<string, unknown>
        )[key];
        Services.get<IListenerMetadataRegistry>(
          "IListenerMetadataRegistry",
        ).register(Enhanced.prototype, {
          methodName: key,
          eventName: key,
          selector: null,
        });
      });
    }

    if (config.listeners) {
      config.listeners.forEach((listener, index) => {
        const methodName = `__pick_dom_listener_${index}`;
        Object.defineProperty(Enhanced.prototype, methodName, {
          value: listener.handler,
          writable: true,
          configurable: true,
        });
        Services.get<IListenerMetadataRegistry>(
          "IListenerMetadataRegistry",
        ).register(Enhanced.prototype, {
          methodName,
          eventName: listener.eventName,
          selector: listener.selector,
        });
      });
    }

    const targetPrototype = (target as { prototype?: Record<string, unknown> })
      .prototype;
    if (targetPrototype) {
      Object.getOwnPropertyNames(targetPrototype).forEach((name) => {
        const value = targetPrototype[name];
        if (name !== "constructor" && typeof value === "function") {
          (Enhanced.prototype as unknown as Record<string, unknown>)[name] =
            value;
        }
      });
    }

    Object.getOwnPropertyNames(target as object).forEach((name) => {
      if (name !== "prototype" && name !== "length" && name !== "name") {
        (Enhanced as unknown as Record<string, unknown>)[name] = (
          target as Record<string, unknown>
        )[name];
      }
    });

    Object.defineProperty(Enhanced, "name", {
      value: (target as { name?: string }).name || "PickComponent",
      configurable: true,
    });

    return Enhanced as unknown as new (...args: unknown[]) => PickComponent;
  }

  /**
   * Creates an initializer class from the captured config, or `undefined` if no initializer was configured.
   *
   * @param config - Captured setup configuration
   * @returns Initializer constructor, or `undefined`
   * @throws Error if initializer function is present but null
   */
  createInitializerClass<TState>(
    config: CapturedConfig<TState>,
  ): (new () => PickInitializer<unknown>) | undefined {
    if (!config.initializer) return undefined;

    const initFn = config.initializer as (
      component: PickComponent,
      deps?: DependencyBag,
    ) => Promise<void>;
    const createDeps = config.initializerCreateDeps;
    const resolveDeps = this.resolveDeps.bind(this);

    if (!initFn) throw new Error("initFn is required");

    return class DynamicInitializer extends PickInitializer<unknown> {
      protected async onInitialize(
        component: PickComponent,
      ): Promise<boolean> {
        const deps = createDeps ? resolveDeps(createDeps) : undefined;
        await initFn.call(component, component, deps);
        return true;
      }
    };
  }

  /**
   * Creates a lifecycle manager class from the captured config, or `undefined` if no lifecycle was configured.
   *
   * @param config - Captured setup configuration
   * @returns Lifecycle manager constructor, or `undefined`
   */
  createLifecycleClass<TState>(
    config: CapturedConfig<TState>,
  ): (new () => PickLifecycleManager<unknown>) | undefined {
    const needsLifecycle = !!(
      config.lifecycle ||
      (config.refs && config.refs.size > 0)
    );
    if (!needsLifecycle) return undefined;

    const lifecycle = config.lifecycle as CapturedConfig["lifecycle"];
    const resolveDeps = this.resolveDeps.bind(this);

    if (!lifecycle) {
      return class DynamicLifecycle extends PickLifecycleManager<PickComponent> {};
    }

    return class DynamicLifecycle extends PickLifecycleManager<PickComponent> {
      protected onComponentReady(component: PickComponent): void {
        if (!lifecycle.onInit) return;
        const deps = lifecycle.createDeps
          ? resolveDeps(lifecycle.createDeps)
          : undefined;
        const subs: ISubscriptionManager = {
          addSubscription: this.addSubscription.bind(this),
        };
        lifecycle.onInit(component, subs, deps);
      }

      protected onComponentDestroy(component: PickComponent): void {
        if (!lifecycle.onDestroy) return;
        const deps = lifecycle.createDeps
          ? resolveDeps(lifecycle.createDeps)
          : undefined;
        const subs: ISubscriptionManager = {
          addSubscription: this.addSubscription.bind(this),
        };
        lifecycle.onDestroy(component, subs, deps);
      }
    };
  }
}
