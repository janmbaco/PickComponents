import {
  PickComponent,
  PickRender,
  Reactive,
  Services,
} from "pick-components";
import { CodePlaygroundInitializer } from "../initializers/code-playground.initializer.js";
import { CodePlaygroundLifecycle } from "../lifecycles/code-playground.lifecycle.js";

import { PLAYGROUND_TEXTS } from "../models/code-playground.texts.js";
import {
  type CodePlaygroundSessionState,
  type CodePlaygroundTabSnapshot,
  fileNameFromPlaygroundSrc,
} from "../models/code-playground.session.js";
import type { PlaygroundEditorTheme } from "../ports/playground-host.port.js";
import { PLAYGROUND_DOWNLOAD_PORT_TOKEN } from "../ports/playground-download.port.js";
import { PLAYGROUND_HOST_PORT_TOKEN } from "../ports/playground-host.port.js";
import {
  PLAYGROUND_PREVIEW_PORT_TOKEN,
  type IPlaygroundPreviewPort,
} from "../ports/playground-preview.port.js";
import { PLAYGROUND_SOURCE_PORT_TOKEN } from "../ports/playground-source.port.js";
import { TYPESCRIPT_TRANSPILER_PORT_TOKEN } from "../ports/typescript-transpiler.port.js";

import CODE_PLAYGROUND_SKELETON from "./code-playground.skeleton.html";
import CODE_PLAYGROUND_TEMPLATE from "./code-playground.template.html";
import CODE_PLAYGROUND_STYLES from "./code-playground.styles.css";
import {
  CodePlaygroundView,
  type CodePlaygroundViewElements,
} from "./code-playground.view.js";

/**
 * Implements the responsibility of providing an interactive code editor
 * with live preview for Pick Components examples.
 *
 * Visual design inspired by the Lit Playground (https://lit.dev/playground/):
 * a unified top bar with file tab and action buttons, a dark code editor on
 * the left, and a "Result" preview panel on the right.
 *
 * Supports two ways to provide initial code:
 * - `src` attribute: URL to fetch (recommended — avoids template escaping)
 * - `setCode()` method: programmatic injection
 *
 * Each run creates a fresh iframe sandbox with its own `customElements`
 * registry and framework bootstrap, preventing element name collisions.
 *
 * @example
 * ```html
 * <code-playground src="/playground-examples/01-hello/en-light/hello.example.ts"></code-playground>
 * ```
 */
@PickRender({
  selector: "code-playground",
  skeleton: CODE_PLAYGROUND_SKELETON,
  initializer: () =>
    new CodePlaygroundInitializer(
      Services.get(PLAYGROUND_SOURCE_PORT_TOKEN),
      Services.get(TYPESCRIPT_TRANSPILER_PORT_TOKEN),
    ),
  lifecycle: () =>
    new CodePlaygroundLifecycle(
      Services.get(PLAYGROUND_SOURCE_PORT_TOKEN),
      Services.get(TYPESCRIPT_TRANSPILER_PORT_TOKEN),
      Services.get(PLAYGROUND_PREVIEW_PORT_TOKEN),
      Services.get(PLAYGROUND_DOWNLOAD_PORT_TOKEN),
      Services.get(PLAYGROUND_HOST_PORT_TOKEN),
    ),
  styles: CODE_PLAYGROUND_STYLES,
  template: CODE_PLAYGROUND_TEMPLATE,
})
export class CodePlayground extends PickComponent {
  /** Transpilation or runtime error messages displayed below the preview. */
  @Reactive error = "";

  /** Filename shown in the first TS file tab. */
  @Reactive fileName = "example.ts";

  /** Current locale injected into the preview sandbox. */
  @Reactive locale = "en";

  /** Source URL for the example file — auto-mapped from the `src` HTML attribute. */
  @Reactive src = "";

  @Reactive runRequestVersion = 0;
  @Reactive resetRequestVersion = 0;
  @Reactive downloadRequestVersion = 0;
  @Reactive codeReplaceRequestVersion = 0;

  private session: CodePlaygroundSessionState | null = null;
  private pendingCodeOverride: string | null = null;
  private view: CodePlaygroundView | null = null;

  get t(): Record<string, string> {
    const locale = this.resolveLocale();
    return { ...PLAYGROUND_TEXTS["en"], ...(PLAYGROUND_TEXTS[locale] ?? {}) };
  }

  /**
   * Programmatically sets the editor code.  Can be called at any time,
   * regardless of whether the editor has been mounted.
   *
   * @param code - TypeScript source code
   */
  setCode(code: string): void {
    if (!this.hasHydratedSession()) {
      return;
    }
    this.pendingCodeOverride = code;
    this.codeReplaceRequestVersion += 1;
  }

  run(): void {
    this.runRequestVersion += 1;
  }

  reset(): void {
    this.resetRequestVersion += 1;
  }

  download(): void {
    this.downloadRequestVersion += 1;
  }

  resolveLocale(): string {
    if (typeof this.locale === "string" && this.locale.trim().length > 0) {
      return this.locale.trim();
    }

    const langMatch = window.location.pathname.match(/^\/([a-z]{2})\b/);
    return langMatch ? langMatch[1] : "en";
  }

  getRequestedSrc(): string {
    return this.src.trim();
  }

  getLoadedSrc(): string {
    return this.session?.src ?? "";
  }

  hasHydratedSession(): boolean {
    return this.session !== null;
  }

  getSession(): CodePlaygroundSessionState | null {
    return this.session;
  }

  mountSession(
    session: CodePlaygroundSessionState,
    theme: PlaygroundEditorTheme,
  ): void {
    this.getView().mountSession(this.requireViewElements(), session, theme);
  }

  resetSurface(theme: PlaygroundEditorTheme): void {
    this.getView().reset(this.requireViewElements(), theme);
  }

  disposeSurface(): void {
    this.view?.dispose();
    this.view = null;
  }

  snapshotTabs(): CodePlaygroundTabSnapshot[] {
    return this.getView().snapshotTabs();
  }

  restoreInitialCode(): void {
    this.getView().restoreInitialCode();
  }

  setPrimaryTypeScriptCode(code: string): void {
    this.getView().setPrimaryTypeScriptCode(code);
  }

  renderPreview(srcdoc: string): void {
    this.getView().renderPreview(this.requireViewElements(), srcdoc);
  }

  reconfigureEditorTheme(theme: PlaygroundEditorTheme): void {
    this.getView().reconfigureEditorTheme(theme);
  }

  applyLoadedSession(session: CodePlaygroundSessionState): void {
    this.session = session;
    this.fileName = session.fileName;
    this.error = "";
  }

  applySourceLoadStart(src: string): void {
    this.session = null;
    this.error = "";
    this.fileName = fileNameFromPlaygroundSrc(src);
  }

  clearError(): void {
    this.error = "";
  }

  reportError(message: string): void {
    this.error = message;
  }

  takePendingCodeOverride(): string | null {
    const code = this.pendingCodeOverride;
    this.pendingCodeOverride = null;
    return code;
  }

  private getView(): CodePlaygroundView {
    if (!this.view) {
      this.view = new CodePlaygroundView(
        Services.get<IPlaygroundPreviewPort>(PLAYGROUND_PREVIEW_PORT_TOKEN),
      );
    }

    return this.view;
  }

  private requireViewElements(): CodePlaygroundViewElements {
    const root = this.resolveHostRoot();
    if (!root) {
      throw new Error(
        "CodePlayground view host is not available. Ensure the component is mounted before accessing its view.",
      );
    }

    const tabBar = root.querySelector<HTMLElement>(".file-tabs");
    const editorPanel = root.querySelector<HTMLElement>(".editor-panel");
    const previewFrame =
      root.querySelector<HTMLIFrameElement>("#preview-frame");
    if (!tabBar || !editorPanel || !previewFrame) {
      throw new Error(
        "CodePlayground template is missing required view elements: .file-tabs, .editor-panel, or #preview-frame.",
      );
    }

    return {
      editorPanel,
      previewFrame,
      tabBar,
    };
  }

  private resolveHostRoot(): HTMLElement | null {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return null;
    }

    try {
      const hostResolver = Services.get<{
        resolve(target: object): HTMLElement;
      }>("IHostResolver");
      return hostResolver.resolve(this);
    } catch {
      return null;
    }
  }
}
