// ── container.ts ─────────────────────────────────────
// Composition root — InjectKit container setup and the bridge adapter
// that connects InjectKit to Pick Components' service registry.
//
// useClass(X) consumes the dependency metadata declared on each class via
// @Injectable({ deps: [...] }), so the container wiring stays explicit.
//
// asSingleton() ensures one shared instance across the entire app.

import { InjectKitRegistry, Container } from "injectkit";
import { DefaultServiceRegistry } from "pick-components";
import { HttpClient, UserService, PostService } from "./services.js";
import { DashboardInitializer } from "./dashboard.initializer.js";

// ── Registry ─────────────────────────────────────────

const registry = new InjectKitRegistry();

registry.register(HttpClient).useClass(HttpClient).asSingleton();

registry.register(UserService).useClass(UserService).asSingleton();

registry.register(PostService).useClass(PostService).asSingleton();

registry
  .register(DashboardInitializer)
  .useClass(DashboardInitializer)
  .asSingleton();

export const container = registry.build();

// ── InjectKitBridge ──────────────────────────────────
// Adapts InjectKit's Container into Pick Components' IServiceRegistry.
//
// Routing strategy:
//   Class tokens (HttpClient, UserService) → InjectKit container
//   String tokens ("IRenderEngine", …)     → DefaultServiceRegistry (framework)

export class InjectKitBridge {
  #fallback = new DefaultServiceRegistry();
  #container: Container;

  constructor(c: Container) {
    this.#container = c;
  }

  get<T>(token: unknown): T {
    if (typeof token === "function") {
      try {
        return this.#container.get(
          token as new (...a: unknown[]) => unknown,
        ) as T;
      } catch {
        /* not in InjectKit — fall through to framework registry */
      }
    }
    return this.#fallback.get(token as string) as T;
  }

  has(token: unknown): boolean {
    if (typeof token === "function") {
      try {
        return this.#container.hasRegistration(
          token as new (...a: unknown[]) => unknown,
        );
      } catch {
        /* fall through */
      }
    }
    return this.#fallback.has(token as string);
  }

  register<T>(token: unknown, instanceOrFactory: T | (() => T)): void {
    this.#fallback.register(
      token as string,
      instanceOrFactory as () => unknown,
    );
  }

  clear(): void {
    this.#fallback.clear();
  }
}
