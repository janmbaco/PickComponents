import { PickInitializer } from "pick-components";
import type { IPlaygroundRoutingPort } from "../../routing/services/playground-routing.port.js";
import type { IPlaygroundThemePort } from "../../navigation/services/playground-theme.port.js";
import type { PlaygroundShell } from "../components/playground-shell.pick.js";
import { resolvePlaygroundShellSession } from "../services/playground-shell.service.js";

export class PlaygroundShellInitializer extends PickInitializer<PlaygroundShell> {
  constructor(
    private readonly routingPort: IPlaygroundRoutingPort,
    private readonly themePort: IPlaygroundThemePort,
  ) {
    super();
  }

  protected onInitialize(component: PlaygroundShell): boolean {
    const preferredThemeMode = this.themePort.readPreferredMode();
    const session = resolvePlaygroundShellSession(
      component.locale,
      this.routingPort.getCurrentPath(),
      preferredThemeMode,
      this.themePort.resolveVariant(preferredThemeMode),
    );

    if (session.needsCanonicalRedirect) {
      this.routingPort.replacePath(session.canonicalPath);
    }

    this.themePort.applyMode(session.theme.mode);
    component.hydrate(session);
    return true;
  }
}
