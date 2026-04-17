// ── users.initializer.ts ─────────────────────────────
// Extends PickInitializer — runs BEFORE render (during skeleton).
//
// The initializer declares its constructor dependency explicitly via `deps`,
// so InjectKit can resolve it without relying on runtime reflection.
//
// Returns true → render template, false → render errorTemplate.

import { Injectable } from "injectkit";
import { PickInitializer } from "pick-components";
import { UserService } from "./services.js";
import type { DiExample } from "./di.example.js";

@Injectable({ deps: [UserService] })
export class UsersInitializer extends PickInitializer<DiExample> {
  constructor(private readonly userSvc: UserService) {
    super();
    if (!userSvc) throw new Error("UserService is required");
  }

  protected async onInitialize(component: DiExample): Promise<boolean> {
    const users = await this.userSvc.getAll();
    component.users = users.slice(0, 5);
    component.userCount = users.length;
    return true;
  }
}
