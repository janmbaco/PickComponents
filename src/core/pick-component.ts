import {
  IntentSignal,
  StateSignal,
  type IIntentSignal,
  type IStateSignal,
} from "../reactive/signal.js";
import { IReactiveState } from "../types/interfaces.js";
import type { PickViewActions } from "../components/pick-action/pick-action-element.js";

/**
 * PickComponent - Base class for reactive web components
 *
 * @description
 * Core abstraction for building reactive UI components with lightweight reactive primitives.
 * Designed to work exclusively with RenderEngine for DOM rendering and compilation.
 *
 * @architecture
 * - **State Management**: Minimal Observables (property streams, destroyed$)
 * - **Reactivity**: @Reactive auto-triggers setState() → state$.next()
 * - **Rendering**: RenderEngine compiles templates, subscribes to state$, updates DOM
 * - **View Actions**: getViewActions() exposes the actions invokable from <pick-action>
 * - **Lifecycle**: onRenderComplete → onDestroy
 * - **Cleanup**: destroyed$ signal + automatic subscription management
 *
 * @example
 * ```typescript
 * @PickRender({
 *   selector: 'counter-app',
 *   template: `
 *     <div class="counter">
 *       <h1>Count: {{count}}</h1>
 *       <button @click="increment">+</button>
 *     </div>
 *   `
 * })
 * class CounterComponent extends PickComponent {
 *   @Reactive count = 0;
 *
 *   increment() {
 *     this.count++; // Auto calls setState()
 *   }
 * }
 * ```
 */
export abstract class PickComponent implements IReactiveState {
  private readonly propertySignals = new Map<string, StateSignal>();

  /**
   * Emits when component is destroyed.
   * Use to signal teardown to custom subscriptions.
   */
  protected readonly destroyed$ = new StateSignal();

  // ============================================================================
  // REACTIVE STATE API
  // ============================================================================

  /**
   * Gets or creates property-specific observable
   *
   * @description
   * Each reactive property has its own Observable channel.
   * When property changes, only subscribers to THAT property are notified.
   * This eliminates unnecessary re-renders.
   *
   * @param propName - Property name (e.g., 'count', 'message')
   * @returns Subject for that specific property
   *
   * @example
   * ```typescript
   * // RenderEngine subscribes to specific property:
   * component.getPropertyObservable('count').subscribe(() => {
   *   // Only runs when 'count' changes
   *   textNode.textContent = component.count;
   * });
   *
   * // @Reactive triggers specific property:
   * this.count++; // Only 'count' subscribers run
   * ```
   */
  getPropertyObservable(propName: string): IStateSignal {
    if (!propName) throw new Error("propName is required");

    if (!this.propertySignals.has(propName)) {
      this.propertySignals.set(propName, new StateSignal());
    }
    return this.propertySignals.get(propName)!;
  }

  /**
   * Creates a typed signal for point-in-time component intentions.
   *
   * @description
   * Intent signals do not participate in template binding and do not trigger
   * rendering by themselves. Subscribe from a LifecycleManager and clean up
   * with addSubscription().
   *
   * @example
   * ```typescript
   * readonly saveRequested$ = this.createIntent();
   * readonly modeRequested$ = this.createIntent<RaceMode>();
   * ```
   */
  protected createIntent<T = void>(): IIntentSignal<T> {
    return new IntentSignal<T>();
  }

  /**
   * Called after DOM rendering completes
   * Override for focus, scroll, animations, etc
   */
  onRenderComplete?(): void;

  /**
   * Exposes the actions that view primitives such as <pick-action> may invoke.
   *
   * @example
   * ```typescript
   * getViewActions() {
   *   return {
   *     increment: () => this.count++,
   *     setMode: (mode) => {
   *       this.mode = mode === "advanced" ? "advanced" : "basic";
   *     },
   *   };
   * }
   * ```
   */
  getViewActions?(): PickViewActions;

  /**
   * Called when component is destroyed.
   * Emits the destroyed$ signal to notify active subscriptions.
   */
  onDestroy?(): void {
    this.destroyed$.notify();
  }
}
