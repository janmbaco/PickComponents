// ── main.ts ──────────────────────────────────────────
// Entry point: creates service instances and wires them into the
// framework's service registry with string tokens.
//
// Execution order matters:
//   1. Register services — string tokens for initializer, lifecycle, and services
//   2. bootstrapFramework — registers 40+ internal framework services
//   3. import component  — @PickRender fires register() which needs those services

import { bootstrapFramework, Services } from "pick-components";
import { UserService, DogService } from "./services.js";
import { ApiInitializer } from "./api.initializer.js";
import { ApiLifecycle } from "./api.lifecycle.js";

// Step 1 — Create service instances.
const userService = new UserService();
const dogService = new DogService();

// Step 2 — Register with string tokens so the component resolves
// initializer, lifecycle, and services without importing concrete classes.
Services.register("DogService", () => dogService);
Services.register("ApiInitializer", () => new ApiInitializer(userService));
Services.register("ApiLifecycle", () => new ApiLifecycle(dogService));

// Step 3 — Bootstrap registers framework-internal services.
await bootstrapFramework(Services);

// Step 4 — Dynamic import so the component module evaluates AFTER both
// the services and the framework internals are available.
await import("./api.example.js");
