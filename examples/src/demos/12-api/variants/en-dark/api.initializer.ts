// ── api.initializer.ts ───────────────────────────────
// Extends PickInitializer — runs BEFORE render (during skeleton).
//
// Loads the initial user list from the API so the template can render
// immediately after initialization completes.
// This initializer only hydrates the state needed for first paint.
// Returns true → render template. Returns false → render errorTemplate.

import { PickInitializer } from "pick-components";
import { UserService } from "./services.js";
import type { ApiExample } from "./api.example.js";

export class ApiInitializer extends PickInitializer<ApiExample> {
  constructor(private readonly userService: UserService) {
    super();
    if (!userService) throw new Error("UserService is required");
  }

  protected async onInitialize(component: ApiExample): Promise<boolean> {
    const users = await this.userService.getAll();
    component.allUsers = users;
    return true;
  }
}
