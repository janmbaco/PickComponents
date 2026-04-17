import {
  IServiceRegistry,
  type ServiceToken,
} from "./service-provider.interface.js";

/**
 * Default Service Registry implementation.
 *
 * @description
 * Simple Map-based registry for Composition Root pattern.
 * Supports both direct instances and factory functions for lazy instantiation.
 * Zero-dependency implementation.
 *
 * @remarks
 * Factory functions enable:
 * - Lazy instantiation (created on first access)
 * - Circular dependency resolution
 * - Dynamic dependency resolution
 */
export class DefaultServiceRegistry implements IServiceRegistry {
  private services = new Map<ServiceToken<unknown>, unknown>();

  /**
   * Registers a service instance or factory function
   *
   * @param token - Service identifier (class constructor or string)
   * @param instanceOrFactory - Service instance or factory function
   *
   * @example
   * ```typescript
   * // Direct instance
   * registry.register(TodoService, new TodoService());
   *
   * // Factory function (lazy)
   * registry.register(TodoService, () => new TodoService());
   *
   * // With dependencies
   * registry.register(TodoService, () => {
   *   const http = registry.get(HttpService);
   *   return new TodoService(http);
   * });
   * ```
   */
  register<T>(token: ServiceToken<T>, instanceOrFactory: T | (() => T)): void {
    if (this.services.has(token)) {
      console.warn(
        `[ServiceRegistry] Service ${this.getTokenName(token)} is already registered. Overwriting.`,
      );
    }
    this.services.set(token, instanceOrFactory);
  }

  /**
   * Retrieves a service instance by token
   *
   * @description
   * If the registered value is a factory function, it will be invoked
   * and the result returned. Otherwise, returns the instance directly.
   *
   * @param token - Service identifier
   * @returns Service instance
   * @throws Error if service is not registered
   */
  get<T>(token: ServiceToken<T>): T {
    if (!this.services.has(token)) {
      throw new Error(
        `[ServiceRegistry] Service '${this.getTokenName(token)}' is not registered. ` +
          `Make sure to register it in your Composition Root.`,
      );
    }

    const value = this.services.get(token);

    // Execute factory function if registered as factory
    // Cache the result so subsequent gets return the same instance (singleton)
    if (typeof value === "function" && !value.prototype) {
      const instance = (value as () => T)();
      this.services.set(token, instance);
      return instance;
    }

    return value as T;
  }

  has(token: ServiceToken): boolean {
    return this.services.has(token);
  }

  clear(): void {
    this.services.clear();
  }

  get size(): number {
    return this.services.size;
  }

  private getTokenName(token: ServiceToken): string {
    if (typeof token === "string") {
      return token;
    }

    if (typeof token === "symbol") {
      return token.toString();
    }

    return token.name || token.toString();
  }
}
