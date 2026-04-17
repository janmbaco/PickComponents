// ── container.ts ─────────────────────────────────────
// Raíz de composición: configura el contenedor de InjectKit y el adaptador
// que conecta InjectKit con el registro de servicios de Pick Components.
//
// useClass(X) consume los metadatos de dependencias declarados en cada clase
// con @Injectable({ deps: [...] }), manteniendo el cableado explícito.
//
// asSingleton() garantiza una instancia compartida para toda la app.

import { InjectKitRegistry, Container } from "injectkit";
import { DefaultServiceRegistry } from "pick-components";
import { HttpClient, UserService, PostService } from "./services.js";
import { DashboardInitializer } from "./dashboard.initializer.js";

// ── Registro ─────────────────────────────────────────

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
// Adapta el Container de InjectKit al IServiceRegistry de Pick Components.
//
// Estrategia de resolución:
//   Tokens de clase (HttpClient, UserService) → contenedor de InjectKit
//   Tokens string ("IRenderEngine", ...)      → DefaultServiceRegistry

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
        /* no está en InjectKit: delegamos en el registro del framework */
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
        /* delegamos */
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
