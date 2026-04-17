// ── dashboard.initializer.ts ─────────────────────────
// Extends PickInitializer — runs BEFORE render (during skeleton).
//
// The initializer declares its constructor dependencies explicitly via
// `deps`, so InjectKit can resolve them without runtime reflection.
//
// Uses Promise.allSettled to load users and posts in parallel —
// partial failures are handled gracefully without blocking the render.
// Returns true → render template.

import { Injectable } from "injectkit";
import { PickInitializer } from "pick-components";
import { UserService, PostService } from "./services.js";
import type { DashboardExample } from "./dashboard.example.js";

@Injectable({ deps: [UserService, PostService] })
export class DashboardInitializer extends PickInitializer<DashboardExample> {
  constructor(
    private readonly userSvc: UserService,
    private readonly postSvc: PostService,
  ) {
    super();
    if (!userSvc) throw new Error("UserService is required");
    if (!postSvc) throw new Error("PostService is required");
  }

  protected async onInitialize(component: DashboardExample): Promise<boolean> {
    const [usersRes, postsRes] = await Promise.allSettled([
      this.userSvc.getAll(),
      this.postSvc.getAll(),
    ]);

    if (usersRes.status === "fulfilled") {
      component.users = usersRes.value.slice(0, 5);
      component.userCount = usersRes.value.length;
    }
    if (postsRes.status === "fulfilled") {
      component.postCount = postsRes.value.length;
    }
    return true;
  }
}
