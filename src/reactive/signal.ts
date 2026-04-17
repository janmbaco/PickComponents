/**
 * Defines the responsibility of representing a minimal teardown function.
 */
export type Unsubscribe = () => void;

type IntentPayload<T> = [T] extends [void] ? [] : [value: T];

export type IntentListener<T = void> = [T] extends [void]
  ? () => void
  : (value: T) => void;

/**
 * Defines the responsibility of broadcasting invalidation signals to listeners.
 */
export interface IStateSignal {
  /**
   * Subscribes a listener to be notified on invalidation.
   * @param listener - Callback invoked when notify() is called
   * @returns Unsubscribe function to remove the listener
   */
  subscribe(listener: () => void): Unsubscribe;

  /**
   * Notifies all current listeners.
   */
  notify(): void;
}

/**
 * Defines the responsibility of broadcasting component intentions.
 *
 * @description
 * Intent signals represent point-in-time user actions or component commands.
 * They are intentionally separate from reactive state: notifying an intent does
 * not update bindings or trigger rendering by itself.
 */
export interface IIntentSignal<T = void> {
  /**
   * Subscribes a listener to be notified when the intent is emitted.
   * @param listener - Callback invoked by notify()
   * @returns Unsubscribe function to remove the listener
   */
  subscribe(listener: IntentListener<T>): Unsubscribe;

  /**
   * Emits the intent, optionally with a typed payload.
   */
  notify(...args: IntentPayload<T>): void;
}

/**
 * Implements the responsibility of multicasting invalidation notifications.
 */
export class StateSignal implements IStateSignal {
  private readonly listeners = new Set<() => void>();

  /**
   * Subscribes a listener to be notified on invalidation.
   *
   * @param listener - Callback invoked when notify() is called
   * @returns Unsubscribe function to remove the listener
   */
  subscribe(listener: () => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifies all current listeners.
   *
   * @description
   * Subscriber exceptions are isolated to prevent one faulty subscriber
   * from breaking the rest of the notification chain.
   */
  notify(): void {
    for (const fn of [...this.listeners]) {
      try {
        fn();
      } catch {
        // Isolation: a faulty subscriber must not break sibling subscribers.
        // Errors are intentionally not re-thrown to preserve notification chain integrity.
      }
    }
  }
}

/**
 * Implements a tiny typed signal for component intentions.
 *
 * @description
 * Use IntentSignal for discrete actions such as save requests, mode changes,
 * downloads, refresh commands, or user interactions that should be coordinated
 * by a LifecycleManager. Use @Reactive for renderable state instead.
 */
export class IntentSignal<T = void> implements IIntentSignal<T> {
  private readonly listeners = new Set<IntentListener<T>>();

  subscribe(listener: IntentListener<T>): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(...args: IntentPayload<T>): void {
    const value = args[0] as T;
    for (const fn of [...this.listeners]) {
      try {
        (fn as (value: T) => void)(value);
      } catch {
        // Isolation: a faulty intent handler must not break sibling handlers.
      }
    }
  }
}
