// ── api.initializer.ts ───────────────────────────────
// Extiende PickInitializer: se ejecuta ANTES del render.
//
// Carga la lista inicial de usuarios para que la plantilla pueda renderizar
// justo después de la inicialización.
// Este inicializador solo hidrata el estado necesario para el primer pintado.
// true → renderiza la plantilla. false → renderiza errorTemplate.

import { PickInitializer } from "pick-components";
import { UserService } from "./services.js";
import type { ApiExample } from "./api.example.js";

export class ApiInitializer extends PickInitializer<ApiExample> {
  constructor(private readonly userService: UserService) {
    super();
    if (!userService) throw new Error("UserService es obligatorio");
  }

  protected async onInitialize(component: ApiExample): Promise<boolean> {
    const users = await this.userService.getAll();
    component.allUsers = users;
    return true;
  }
}
