import { test, expect } from "@playwright/test";
import { PickInitializer } from "../../src/behaviors/pick-initializer";
import { PickLifecycleManager } from "../../src/behaviors/pick-lifecycle-manager";
import { DefaultServiceRegistry } from "../../src/providers/default-service-provider";
import type {
  InitializerFactory,
  LifecycleFactory,
} from "../../src/core/component-metadata";

/**
 * Integration tests for Dependency Injection with Initializers and Lifecycles.
 *
 * Tests cover:
 * - Factory functions creating initializers with constructor injection
 * - Factory functions creating lifecycles with constructor injection
 * - No-dependency initializer/lifecycle factories
 */
test.describe("DI Integration - Initializer Factory Functions", () => {
  class Logger {
    logs: string[] = [];
    log(msg: string): void {
      this.logs.push(msg);
    }
  }

  class ApiService {
    fetchCalled = false;
    fetch(): string {
      this.fetchCalled = true;
      return "api-data";
    }
  }

  class ConfigService {
    getValue(key: string): string {
      return `config-${key}`;
    }
  }

  test("should create initializer via factory function with constructor injection", async () => {
    // Arrange
    const logger = new Logger();
    const api = new ApiService();

    class TestInitializer extends PickInitializer<any> {
      constructor(
        private readonly logger: Logger,
        private readonly api: ApiService,
      ) {
        super();
      }

      protected async onInitialize(component: any): Promise<boolean> {
        this.logger.log("Initializing");
        component.data = this.api.fetch();
        return true;
      }
    }

    const factory: InitializerFactory = () => new TestInitializer(logger, api);
    const component: any = { data: null };

    // Act
    const initializer = factory();
    const result = await initializer.initialize(component);

    // Assert
    expect(result).toBe(true);
    expect(logger.logs).toContain("Initializing");
    expect(api.fetchCalled).toBe(true);
    expect(component.data).toBe("api-data");
  });

  test("should create initializer without dependencies", async () => {
    // Arrange
    class SimpleInitializer extends PickInitializer<any> {
      protected async onInitialize(component: any): Promise<boolean> {
        component.initialized = true;
        return true;
      }
    }

    const factory: InitializerFactory = () => new SimpleInitializer();
    const component: any = { initialized: false };

    // Act
    const initializer = factory();
    const result = await initializer.initialize(component);

    // Assert
    expect(result).toBe(true);
    expect(component.initialized).toBe(true);
  });

  test("should create initializer with multiple constructor dependencies", async () => {
    // Arrange
    const logger = new Logger();
    const api = new ApiService();
    const config = new ConfigService();

    class MultiDepInitializer extends PickInitializer<any> {
      constructor(
        private readonly logger: Logger,
        private readonly api: ApiService,
        private readonly config: ConfigService,
      ) {
        super();
      }

      protected async onInitialize(component: any): Promise<boolean> {
        this.logger.log("Multi-dep init");
        component.data = this.api.fetch();
        component.setting = this.config.getValue("theme");
        return true;
      }
    }

    const factory: InitializerFactory = () =>
      new MultiDepInitializer(logger, api, config);
    const component: any = {};

    // Act
    const initializer = factory();
    await initializer.initialize(component);

    // Assert
    expect(logger.logs).toContain("Multi-dep init");
    expect(component.data).toBe("api-data");
    expect(component.setting).toBe("config-theme");
  });

  test("should resolve dependencies from ServiceRegistry in factory function", async () => {
    // Arrange
    const registry = new DefaultServiceRegistry();
    const logger = new Logger();
    registry.register("ILogger", () => logger);

    class RegistryInitializer extends PickInitializer<any> {
      constructor(private readonly logger: Logger) {
        super();
      }

      protected async onInitialize(component: any): Promise<boolean> {
        this.logger.log("Registry resolved");
        component.done = true;
        return true;
      }
    }

    const factory: InitializerFactory = () =>
      new RegistryInitializer(registry.get<Logger>("ILogger"));
    const component: any = {};

    // Act
    const initializer = factory();
    await initializer.initialize(component);

    // Assert
    expect(logger.logs).toContain("Registry resolved");
    expect(component.done).toBe(true);
  });
});

test.describe("DI Integration - Lifecycle Factory Functions", () => {
  class EventBus {
    events: string[] = [];
    emit(event: string): void {
      this.events.push(event);
    }
  }

  class StateManager {
    state: Record<string, unknown> = {};
    setState(key: string, value: unknown): void {
      this.state[key] = value;
    }
  }

  test("should create lifecycle via factory function with constructor injection", () => {
    // Arrange
    const eventBus = new EventBus();
    const stateManager = new StateManager();

    class TestLifecycle extends PickLifecycleManager<any> {
      constructor(
        private readonly eventBus: EventBus,
        private readonly stateManager: StateManager,
      ) {
        super();
      }

      protected onComponentReady(component: any): void {
        this.eventBus.emit("component-ready");
        this.stateManager.setState("status", "ready");
        component.initialized = true;
      }
    }

    const factory: LifecycleFactory = () =>
      new TestLifecycle(eventBus, stateManager);
    const component: any = { initialized: false };

    // Act
    const lifecycle = factory();
    lifecycle.startListening(component);

    // Assert
    expect(eventBus.events).toContain("component-ready");
    expect(stateManager.state.status).toBe("ready");
    expect(component.initialized).toBe(true);
  });

  test("should create lifecycle without dependencies", () => {
    // Arrange
    class SimpleLifecycle extends PickLifecycleManager<any> {
      protected onComponentReady(component: any): void {
        component.ready = true;
      }
    }

    const factory: LifecycleFactory = () => new SimpleLifecycle();
    const component: any = { ready: false };

    // Act
    const lifecycle = factory();
    lifecycle.startListening(component);

    // Assert
    expect(component.ready).toBe(true);
  });

  test("should handle cleanup with injected dependencies", () => {
    // Arrange
    const eventBus = new EventBus();

    class CleanupLifecycle extends PickLifecycleManager<any> {
      constructor(private readonly eventBus: EventBus) {
        super();
      }

      protected onComponentReady(_component: any): void {
        this.eventBus.emit("ready");
      }

      protected onComponentDestroy(_component: any): void {
        this.eventBus.emit("cleanup");
      }
    }

    const factory: LifecycleFactory = () => new CleanupLifecycle(eventBus);
    const component: any = {};

    // Act
    const lifecycle = factory();
    lifecycle.startListening(component);
    lifecycle.stopListening();

    // Assert
    expect(eventBus.events).toContain("ready");
    expect(eventBus.events).toContain("cleanup");
  });
});
