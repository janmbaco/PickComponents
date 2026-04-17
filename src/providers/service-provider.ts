import {
  IServiceRegistry,
  type ServiceToken,
} from "./service-provider.interface.js";
import { DefaultServiceRegistry } from "./default-service-provider.js";

/**
 * Global Service Registry Facade.
 *
 * @description
 * Provides a single global access point to the service registry
 * while allowing the underlying implementation to be swapped at runtime.
 *
 * @remarks
 * This facade enables integration with external DI containers like:
 * - TSyringe
 * - InversifyJS
 * - Angular's Injector
 * - Custom implementations
 */
class ServiceRegistryFacade implements IServiceRegistry {
  private static readonly SERVICE_PROVIDER_TOKEN = "IServiceProvider";

  private implementation: IServiceRegistry = new DefaultServiceRegistry();
  private hasRegistrations = false;

  /**
   * Replace the underlying registry implementation.
   *
   * @description
   * Use this to integrate with external DI containers **before** calling
   * `bootstrapFramework()`. Swapping after bootstrap destroys all registered
   * framework services and will cause runtime errors.
   *
   * @remarks
   * The custom implementation must honour these contracts:
   * - `get()` must return the **same singleton** on every call for a given token.
   * - `register()` must treat factory functions lazily (invoke on first `get()`, not on `register()`).
   *
   * @param impl - New registry implementation
   * @throws Error if `register()` has already been called (i.e. after bootstrap)
   *
   * @example
   * ```typescript
   * // Must be called BEFORE bootstrapFramework()
   * const angularAdapter = new AngularInjectorAdapter(injector);
   * Services.useImplementation(angularAdapter);
   * bootstrapFramework(Services);
   * ```
   */
  useImplementation(impl: IServiceRegistry): void {
    if (!impl) {
      throw new Error(
        "[ServiceRegistryFacade] Implementation must not be null or undefined.",
      );
    }
    if (impl === (this as unknown as IServiceRegistry)) {
      throw new Error(
        "[ServiceRegistryFacade] Cannot use the facade as its own implementation: would cause infinite recursion.",
      );
    }
    if (this.hasRegistrations) {
      throw new Error(
        "[ServiceRegistryFacade] Cannot swap implementation after services have been registered. " +
          "Call useImplementation() before bootstrapFramework().",
      );
    }
    this.implementation = impl;
  }

  register<T>(token: ServiceToken<T>, instanceOrFactory: T | (() => T)): void {
    if (token === ServiceRegistryFacade.SERVICE_PROVIDER_TOKEN) {
      throw new Error(
        `[ServiceRegistryFacade] Token '${ServiceRegistryFacade.SERVICE_PROVIDER_TOKEN}' is reserved. ` +
          "The service provider is always the facade itself and cannot be overridden.",
      );
    }
    this.hasRegistrations = true;
    this.implementation.register(token, instanceOrFactory);
  }

  get<T>(token: ServiceToken<T>): T {
    if (token === ServiceRegistryFacade.SERVICE_PROVIDER_TOKEN) {
      return this as unknown as T;
    }
    return this.implementation.get(token);
  }

  has(token: ServiceToken): boolean {
    if (token === ServiceRegistryFacade.SERVICE_PROVIDER_TOKEN) {
      return true;
    }
    return this.implementation.has(token);
  }

  clear(): void {
    this.hasRegistrations = false;
    this.implementation.clear();
    this.implementation = new DefaultServiceRegistry();
  }
}

/**
 * Global service registry instance.
 *
 * @description
 * Use this in your Composition Root to register services at application startup.
 * Consumers should depend on IServiceProvider interface, not this global instance.
 *
 * @example
 * ```typescript
 * // Composition Root (main.ts or bootstrap.ts)
 * Services.register(TodoService, () => new TodoService());
 * Services.register(HttpService, new HttpService());
 *
 * // Consumer (RenderEngine, LifecycleManager, etc.)
 * constructor(private serviceProvider: IServiceProvider) {}
 * ```
 */
export const Services = new ServiceRegistryFacade();

// Re-export interfaces for convenience
export type {
  IServiceProvider,
  IServiceRegistry,
} from "./service-provider.interface.js";
export { DefaultServiceRegistry } from "./default-service-provider.js";
