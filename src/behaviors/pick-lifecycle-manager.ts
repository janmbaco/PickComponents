import type { Unsubscribe } from "../reactive/signal.js";
import { ILifecycleManager } from "../types/interfaces.js";

/**
 * Base class for lifecycle managers
 *
 * @description
 * THE CRITICAL MEDIATOR in Pick Components architecture.
 * LifecycleManager is the ONLY entity that knows both Component AND Service.
 *
 * 1:1 relationship: Each component instance has its own lifecycle manager.
 *
 * Responsibilities:
 * - Listen to Component events (Subject streams)
 * - Call Service methods (business logic execution)
 * - Subscribe to Service observables (business state changes)
 * - Update Component imperatively (view state updates)
 * - Listen to EventBus (cross-component communication)
 * - Manage subscription lifecycle (automatic cleanup)
 *
 * DOM Access:
 * - User components use @Listen decorator for event binding
 *
 * @example
 * ```typescript
 * class TodoListLifecycleManager extends PickLifecycleManager<TodoListComponent> {
 *   constructor(private todoService: TodoService) {
 *     super();
 *   }
 *
 *   onComponentReady(component: TodoListComponent): void {
 *     // Component → Service (listen to intents, execute business logic)
 *     this.addSubscription(
 *       component.todoAdded$.subscribe(text => {
 *         this.todoService.addTodo(text);
 *       })
 *     );
 *   }
 *
 *   onComponentDestroy(): void {
 *     // Cleanup happens automatically via addSubscription
 *   }
 * }
 * ```
 */
export abstract class PickLifecycleManager<
  TComponent = unknown,
> implements ILifecycleManager<TComponent> {
  private _component: TComponent | null = null;
  private _teardowns: Unsubscribe[] = [];
  private _isListening = false;

  get component(): TComponent | null {
    return this._component;
  }

  /**
   * Starts listening to events and managing the component lifecycle
   *
   * @param component - Component instance
   */
  startListening(component: TComponent): void {
    // Idempotent: if already listening to this component, skip
    if (this._isListening && this._component === component) {
      return;
    }

    // If we were listening to another component, clean up first
    if (this._isListening && this._component && this._component !== component) {
      this.stopListening();
    }

    this._component = component;
    this._isListening = true;

    // Call the hook with component parameter for easy access
    this.onComponentReady(component);
  }

  /**
   * Stops listening to events and cleans up subscriptions
   */
  stopListening(): void {
    if (!this._isListening) {
      return;
    }

    if (this._component) {
      this.onComponentDestroy(this._component);
    }

    this.cleanupSubscriptions();

    this._isListening = false;
  }

  /**
   * Disposes of all resources
   */
  dispose(): void {
    this.stopListening();
    this._component = null;
  }

  /**
   * Hook called when component is ready and fully rendered
   *
   * @remarks
   * Override this to set up:
   * - Component Subject subscriptions → Service method calls
   * - Service Observable subscriptions → Component state updates
   * - EventBus subscriptions → Component state updates
   *
   * @param component - The component instance with full access
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onComponentReady(_component: TComponent): void {
    // Override in subclass
  }

  /**
   * Hook called when component is being destroyed
   *
   * @remarks
   * Override this to clean up any custom resources.
   * Subscriptions and event listeners are cleaned up automatically.
   *
   * @param component - The component instance
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onComponentDestroy(_component: TComponent): void {
    // Override in subclass when needed
  }

  /**
   * Adds a teardown callback to be managed by the lifecycle manager
   *
   * @remarks
   * Teardown callbacks are automatically called when component is destroyed.
   * Used for cleaning up subscriptions to observables and streams.
   *
   * @example
   * ```typescript
   * // Subscribe to component stream
   * const unsub = component.taskAdded$.subscribe(text => {
   *   this.taskService.addTask(text);
   * });
   * this.addSubscription(unsub);
   *
   * // Subscribe to service observable
   * const unsub2 = this.taskService.tasks$.subscribe(tasks => {
   *   component.tasks = tasks;
   * });
   * this.addSubscription(unsub2);
   * ```
   */
  protected addSubscription(unsub: Unsubscribe): void {
    this._teardowns.push(unsub);
  }

  /**
   * Cleans up all managed teardown callbacks
   */
  private cleanupSubscriptions(): void {
    this._teardowns.forEach((fn) => {
      try {
        fn();
      } catch {
        /* no-op */
      }
    });
    this._teardowns = [];
  }
}
