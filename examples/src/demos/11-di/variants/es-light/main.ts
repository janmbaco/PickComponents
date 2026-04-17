// ── main.ts ──────────────────────────────────────────
// Punto de entrada: conecta el bridge de InjectKit y arranca el framework.
//
// El orden importa:
//   1. useImplementation() — cambia el registro base ANTES de cualquier register()
//   2. bootstrapFramework  — registra los servicios internos del framework
//   3. importar componente — @PickRender dispara register() y necesita esos servicios
//
// InjectKit resuelve dependencias desde los metadatos `deps` declarados
// en cada servicio/inicializador, así que aquí no hace falta reflection.

import { bootstrapFramework, Services } from "pick-components";
import { container, InjectKitBridge } from "./container.js";
import { UsersInitializer } from "./users.initializer.js";

// Paso 1 — Conectar InjectKit al registro de servicios de Pick Components.
Services.useImplementation(new InjectKitBridge(container));

// Alias textual para que el componente resuelva el inicializador por nombre
// sin importar la clase concreta. Así evitamos acoplamiento.
Services.register("UsersInitializer", () => container.get(UsersInitializer));

// Paso 2 — Bootstrap registra los servicios internos del framework.
await bootstrapFramework(Services);

// Paso 3 — Import dinámico para evaluar el componente DESPUÉS de que
// estén disponibles el bridge y los servicios del framework.
await import("./di.example.js");
