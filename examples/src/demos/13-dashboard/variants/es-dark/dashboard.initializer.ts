// ── dashboard.initializer.ts ─────────────────────────
// Extiende PickInitializer: se ejecuta ANTES del render.
//
// El inicializador declara sus dependencias de constructor con `deps`,
// así InjectKit puede resolverlas sin reflection en runtime.
//
// Usa Promise.allSettled para cargar usuarios y publicaciones en paralelo:
// los fallos parciales no bloquean el render.
// true → renderiza la plantilla.

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
    if (!userSvc) throw new Error("UserService es obligatorio");
    if (!postSvc) throw new Error("PostService es obligatorio");
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
