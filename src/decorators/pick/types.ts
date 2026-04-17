import type { PickComponent } from "../../core/pick-component.js";
import type { Unsubscribe } from "../../reactive/signal.js";

/**
 * Defines the responsibility of describing concrete dependencies used by dynamic components.
 */
export type DependencyBag = Record<string, unknown>;

/**
 * Defines the responsibility of creating a dependency bag for each execution.
 */
export type DependencyBagFactory<TDeps extends DependencyBag = DependencyBag> =
  () => TDeps;

/**
 * Defines the minimal surface exposed to inline lifecycle hooks for subscription cleanup.
 */
export interface ISubscriptionManager {
  addSubscription(unsubscribe: Unsubscribe): void;
}

/**
 * Defines the responsibility of carrying a generic type without runtime impact.
 * Used to mark generic usage and satisfy lint rules while returning `void`.
 */
export type TypeHint<T> = T extends unknown ? void : void;

export type DomListenerHandler<TState = unknown> = (
  this: PickComponent & TState,
  event: Event,
) => unknown;

/**
 * Defines the responsibility of providing the functional setup API for Pick components.
 *
 * @template TState - Type of the component state object
 */
export interface InlineContext<TState = unknown> {
  /** Define reactive state properties */
  state(initial: TState): void;
  /** Define event handlers (reactions to component events) */
  on(
    handlers: Record<
      string,
      (this: PickComponent & TState, ...args: unknown[]) => unknown
    >,
  ): void;
  /** Define a per-component intention signal property */
  intent<TPayload = void>(name: string): TypeHint<TPayload>;
  /** Listen to native DOM events from the rendered component root */
  listen(eventName: string, handler: DomListenerHandler<TState>): void;
  /** Listen to native DOM events delegated from a selector inside the template */
  listen(
    selector: string,
    eventName: string,
    handler: DomListenerHandler<TState>,
  ): void;
  /** Define computed (derived) properties */
  computed(
    computed: Record<string, (this: PickComponent & TState) => unknown>,
  ): void;
  /** Define lifecycle hooks (onInit / onDestroy) with an optional dependency factory */
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
  ): void;
  /** Set component HTML template */
  html(template: string): void;
  /** Set skeleton loading template */
  skeleton(template: string): void;
  /** Set error fallback template */
  errorTemplate(template: string): void;
  /** Set component scoped CSS styles */
  css(styles: string): void;
  /** Define async initialization logic with an optional dependency factory */
  initializer<TDeps extends DependencyBag = DependencyBag>(
    fn: (
      this: PickComponent & TState,
      component: PickComponent & TState,
      deps?: TDeps,
    ) => Promise<void>,
    createDeps?: DependencyBagFactory<TDeps>,
  ): void;
  /** Define validation rules or business configuration */
  rules(config: Record<string, unknown>): void;
  /** Access typed props */
  props<TProps = unknown>(): TypeHint<TProps>;
  /** Register template element reference */
  ref(name: string): void;
}

export interface CapturedDomListener<TState = unknown> {
  selector: string | null;
  eventName: string;
  handler: DomListenerHandler<TState>;
}

export interface CapturedIntent {
  name: string;
}

/**
 * Defines the responsibility of capturing setup data from InlineContext calls.
 */
export interface CapturedConfig<TState = unknown> {
  state?: TState;
  methods?: Record<
    string,
    (this: PickComponent & TState, ...args: unknown[]) => unknown
  >;
  intents?: CapturedIntent[];
  listeners?: Array<CapturedDomListener<TState>>;
  computed?: Record<string, (this: PickComponent & TState) => unknown>;
  rules?: Record<string, unknown>;
  lifecycle?: {
    onInit?: (
      component: PickComponent & TState,
      subs: ISubscriptionManager,
      deps: DependencyBag | undefined,
    ) => void;
    onDestroy?: (
      component: PickComponent & TState,
      subs: ISubscriptionManager,
      deps: DependencyBag | undefined,
    ) => void;
    createDeps?: DependencyBagFactory;
  };
  template?: string;
  skeleton?: string;
  errorTemplate?: string;
  styles?: string;
  initializer?: (
    component: PickComponent & TState,
    deps?: DependencyBag,
  ) => Promise<void>;
  initializerCreateDeps?: DependencyBagFactory;
  refs?: Set<string>;
  propsTyped?: boolean;
}
