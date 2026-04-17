// ── main.ts ──────────────────────────────────────────
// Entry point: creates the CatalogService instance and registers it
// in the framework's service registry with a string token.
//
// Execution order matters:
//   1. Register service — string token for the catalog service
//   2. bootstrapFramework — registers 40+ internal framework services
//   3. import component  — @Pick fires register() which needs those services
//
// The @Pick setup function resolves the service lazily via Services.get()
// in its deps factories and action handlers — not at decorator evaluation time.

import { bootstrapFramework, Services } from "pick-components";
import { CatalogService } from "./services.js";

// Step 1 — Create and register the service instance.
const catalogService = new CatalogService();
Services.register("CatalogService", () => catalogService);

// Step 2 — Bootstrap registers framework-internal services.
await bootstrapFramework(Services);

// Step 3 — Dynamic import so the component module evaluates AFTER both
// the service and the framework internals are available.
await import("./pick.example.js");
