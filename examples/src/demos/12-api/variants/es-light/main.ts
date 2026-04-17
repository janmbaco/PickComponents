// ── main.ts ──────────────────────────────────────────
// Punto de entrada: crea servicios y los registra en el framework
// mediante tokens textuales.
//
// El orden importa:
//   1. Registrar servicios: tokens para inicializador, ciclo de vida y servicios
//   2. bootstrapFramework: registra los servicios internos del framework
//   3. importar componente: @PickRender necesita esos servicios al registrarse

import { bootstrapFramework, Services } from "pick-components";
import { UserService, DogService } from "./services.js";
import { ApiInitializer } from "./api.initializer.js";
import { ApiLifecycle } from "./api.lifecycle.js";

// Paso 1 — Crear instancias de servicios.
const userService = new UserService();
const dogService = new DogService();

// Paso 2 — Registrar tokens para que el componente resuelva inicializador
// y ciclo de vida sin importar clases concretas.
Services.register("DogService", () => dogService);
Services.register("ApiInitializer", () => new ApiInitializer(userService));
Services.register("ApiLifecycle", () => new ApiLifecycle(dogService));

// Paso 3 — Bootstrap registra los servicios internos del framework.
await bootstrapFramework(Services);

// Paso 4 — Import dinámico para evaluar el componente DESPUÉS de que
// estén disponibles los servicios y el framework.
await import("./api.example.js");
