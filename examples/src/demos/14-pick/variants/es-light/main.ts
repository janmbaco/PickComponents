// ── main.ts ──────────────────────────────────────────
// Punto de entrada: crea CatalogService y lo registra en el framework
// mediante un token textual.
//
// El orden importa:
//   1. registrar servicio: token textual para el catálogo
//   2. bootstrapFramework: registra los servicios internos del framework
//   3. importar componente: @Pick necesita esos servicios al registrarse
//
// La función de setup de @Pick resuelve el servicio de forma perezosa
// con Services.get(), no durante la evaluación del decorador.

import { bootstrapFramework, Services } from "pick-components";
import { CatalogService } from "./services.js";

// Paso 1 — Crear y registrar la instancia del servicio.
const catalogService = new CatalogService();
Services.register("CatalogService", () => catalogService);

// Paso 2 — Bootstrap registra los servicios internos del framework.
await bootstrapFramework(Services);

// Paso 3 — Import dinámico para evaluar el componente DESPUÉS de que
// estén disponibles el servicio y el framework.
await import("./pick.example.js");
