// ── users.initializer.ts ─────────────────────────────
// Extiende PickInitializer: se ejecuta ANTES del render.
//
// El inicializador declara su dependencia de constructor con `deps`,
// así InjectKit puede resolverla sin depender de reflection en runtime.
//
// true → renderiza la plantilla. false → renderiza errorTemplate.

import { Injectable } from "injectkit";
import { PickInitializer } from "pick-components";
import { UserService } from "./services.js";
import type { DiExample } from "./di.example.js";

@Injectable({ deps: [UserService] })
export class UsersInitializer extends PickInitializer<DiExample> {
  constructor(private readonly userSvc: UserService) {
    super();
    if (!userSvc) throw new Error("UserService es obligatorio");
  }

  protected async onInitialize(component: DiExample): Promise<boolean> {
    const users = await this.userSvc.getAll();
    component.users = users.slice(0, 5);
    component.userCount = users.length;
    return true;
  }
}
