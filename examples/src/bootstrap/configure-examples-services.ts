import { Services } from "pick-components";
import {
  BrowserPlaygroundRoutingPort,
  PLAYGROUND_ROUTING_PORT_TOKEN,
} from "../features/routing/services/playground-routing.port.js";
import {
  BrowserPlaygroundThemePort,
  PLAYGROUND_THEME_PORT_TOKEN,
} from "../features/navigation/services/playground-theme.port.js";
import {
  BrowserPlaygroundDownloadPort,
  PLAYGROUND_DOWNLOAD_PORT_TOKEN,
} from "../features/playground/ports/playground-download.port.js";
import {
  BrowserPlaygroundHostPort,
  PLAYGROUND_HOST_PORT_TOKEN,
} from "../features/playground/ports/playground-host.port.js";
import {
  BrowserPlaygroundPreviewPort,
  PLAYGROUND_PREVIEW_PORT_TOKEN,
} from "../features/playground/ports/playground-preview.port.js";
import {
  BrowserPlaygroundSourcePort,
  PLAYGROUND_SOURCE_PORT_TOKEN,
} from "../features/playground/ports/playground-source.port.js";
import {
  BrowserTypeScriptTranspilerPort,
  TYPESCRIPT_TRANSPILER_PORT_TOKEN,
} from "../features/playground/ports/typescript-transpiler.port.js";

export function configureExamplesServices(): void {
  if (!Services.has(PLAYGROUND_ROUTING_PORT_TOKEN)) {
    Services.register(
      PLAYGROUND_ROUTING_PORT_TOKEN,
      () => new BrowserPlaygroundRoutingPort(),
    );
  }

  if (!Services.has(PLAYGROUND_THEME_PORT_TOKEN)) {
    Services.register(
      PLAYGROUND_THEME_PORT_TOKEN,
      () => new BrowserPlaygroundThemePort(),
    );
  }

  if (!Services.has(PLAYGROUND_SOURCE_PORT_TOKEN)) {
    Services.register(
      PLAYGROUND_SOURCE_PORT_TOKEN,
      () => new BrowserPlaygroundSourcePort(),
    );
  }

  if (!Services.has(TYPESCRIPT_TRANSPILER_PORT_TOKEN)) {
    Services.register(
      TYPESCRIPT_TRANSPILER_PORT_TOKEN,
      () => new BrowserTypeScriptTranspilerPort(),
    );
  }

  if (!Services.has(PLAYGROUND_PREVIEW_PORT_TOKEN)) {
    Services.register(
      PLAYGROUND_PREVIEW_PORT_TOKEN,
      () => new BrowserPlaygroundPreviewPort(),
    );
  }

  if (!Services.has(PLAYGROUND_DOWNLOAD_PORT_TOKEN)) {
    Services.register(
      PLAYGROUND_DOWNLOAD_PORT_TOKEN,
      () => new BrowserPlaygroundDownloadPort(),
    );
  }

  if (!Services.has(PLAYGROUND_HOST_PORT_TOKEN)) {
    Services.register(
      PLAYGROUND_HOST_PORT_TOKEN,
      () => new BrowserPlaygroundHostPort(),
    );
  }
}
