import { PickLifecycleManager } from "pick-components";
import type { IPlaygroundRoutingPort } from "../../routing/services/playground-routing.port.js";
import type { IPlaygroundThemePort } from "../../navigation/services/playground-theme.port.js";
import { nextThemeMode } from "../../navigation/models/playground-theme.js";
import type { PlaygroundShell } from "../components/playground-shell.pick.js";
import { resolvePlaygroundShellSession } from "../services/playground-shell.service.js";

export class PlaygroundShellLifecycle extends PickLifecycleManager<PlaygroundShell> {
  constructor(
    private readonly routingPort: IPlaygroundRoutingPort,
    private readonly themePort: IPlaygroundThemePort,
  ) {
    super();
  }

  protected onComponentReady(component: PlaygroundShell): void {
    this.addSubscription(
      component
        .getPropertyObservable("themeCycleRequestVersion")
        .subscribe(() => {
          const nextMode = nextThemeMode(component.themeMode);
          this.themePort.persistMode(nextMode);
          this.themePort.applyMode(nextMode);
          component.hydrate(
            resolvePlaygroundShellSession(
              component.locale,
              component.currentPath,
              nextMode,
              this.themePort.resolveVariant(nextMode),
            ),
          );
        }),
    );

    const stopListening = this.routingPort.subscribeToRouteChanges((path) => {
      const session = resolvePlaygroundShellSession(
        component.locale,
        path,
        component.themeMode,
        this.themePort.resolveVariant(component.themeMode),
      );

      if (session.needsCanonicalRedirect) {
        this.routingPort.replacePath(session.canonicalPath);
      }

      component.hydrate(session);
    });

    this.addSubscription(stopListening);
  }
}
