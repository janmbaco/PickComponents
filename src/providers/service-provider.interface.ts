/**
 * Token used to identify services in the DI container.
 * The any in constructor signatures is type-level only and unavoidable for generic constructors.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type ServiceToken<T = unknown> =
  | string
  | symbol
  | (abstract new (...args: any[]) => T)
  | (new (...args: any[]) => T);
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Interface for Service Provider (Dependency Inversion Principle - Read Access)
 *
 * @description
 * Defines read-only access to the service container.
 * Consumers should depend on this interface instead of the full registry
 * to follow Interface Segregation Principle.
 *
 * @remarks
 * This interface is the foundation for Dependency Injection in Pick Components.
 * Classes should receive IServiceProvider in their constructor, not the full registry.
 */
export interface IServiceProvider {
  /**
   * Retrieves a service instance by token
   * @param token - Service identifier (class constructor or string)
   * @returns Service instance
   * @throws Error if service is not registered
   */
  get<T>(token: ServiceToken<T>): T;

  /**
   * Checks if a service is registered
   * @param token - Service identifier
   * @returns true if registered, false otherwise
   */
  has(token: ServiceToken): boolean;
}

/**
 * Interface for Service Registry (Dependency Inversion Principle - Write Access)
 *
 * @description
 * Extends IServiceProvider with registration capabilities.
 * Only the Composition Root should use this interface.
 *
 * @remarks
 * Allows swapping the underlying DI container (e.g., use TSyringe, InversifyJS).
 */
export interface IServiceRegistry extends IServiceProvider {
  /**
   * Registers a service instance or factory function
   * @param token - Service identifier (class constructor or string)
   * @param instanceOrFactory - Service instance or factory function
   */
  register<T>(token: ServiceToken<T>, instanceOrFactory: T | (() => T)): void;

  /**
   * Clears all registered services
   */
  clear(): void;
}
