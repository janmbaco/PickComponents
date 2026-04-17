/**
 * Implements the responsibility of tracking reactive property access
 * during computed getter evaluation.
 *
 * @description
 * Encapsulates the tracking context that `@Reactive` getters participate in.
 * When a computed getter is evaluated under `discoverDependencies()`, any
 * `@Reactive` accessor that is read will record its property name via
 * `trackAccess()`.
 */

import type { IDependencyTracker } from "./dependency-tracker.interface.js";

/**
 * Implements the responsibility of tracking reactive property dependencies
 * using an internal Set-based tracking context.
 */
export class DependencyTracker implements IDependencyTracker {
  private activeTracker: Set<string> | null = null;

  /**
   * Records a property access in the active tracking context.
   * Called by `@Reactive` getters during dependency discovery.
   * No-op when no tracking context is active.
   *
   * @param propertyName - Name of the reactive property being read
   */
  trackAccess(propertyName: string): void {
    if (this.activeTracker) {
      this.activeTracker.add(propertyName);
    }
  }

  /**
   * Runs a function while tracking which reactive properties are accessed.
   *
   * @param fn - Function to run (typically a getter invocation)
   * @returns Array of reactive property names that were read during execution
   */
  discoverDependencies(fn: () => unknown): string[] {
    const deps = new Set<string>();
    this.activeTracker = deps;
    try {
      fn();
    } finally {
      this.activeTracker = null;
    }
    return Array.from(deps);
  }
}
