// ── main.ts ──────────────────────────────────────────
// Entry point: wires the InjectKit bridge and bootstraps the framework.
//
// Execution order matters:
//   1. useImplementation() — swaps the backing registry BEFORE any register()
//   2. bootstrapFramework  — registers 40+ internal services (IComponentMetadataRegistry, etc.)
//   3. import component    — @PickRender fires register() which needs those services
//
// InjectKit resolves dependencies from the explicit `deps` metadata declared
// on each service/initializer, so no reflection bootstrap is required here.

import { bootstrapFramework, Services } from "pick-components";
import { container, InjectKitBridge } from "./container.js";
import { UsersInitializer } from "./users.initializer.js";

// Step 1 — Bridge InjectKit into Pick Components' service registry.
Services.useImplementation(new InjectKitBridge(container));

// String alias so the component resolves the initializer by name
// without importing the concrete class — avoids coupling.
Services.register("UsersInitializer", () => container.get(UsersInitializer));

// Step 2 — Bootstrap registers framework-internal services.
await bootstrapFramework(Services);

// Step 3 — Dynamic import so the component module evaluates AFTER both
// the bridge and the framework services are available.
await import("./di.example.js");
