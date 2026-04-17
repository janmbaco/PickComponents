import { PickLifecycleManager } from "pick-components";
import type { CodePlayground } from "../components/code-playground.pick.js";
import type { IPlaygroundDownloadPort } from "../ports/playground-download.port.js";
import type { IPlaygroundHostPort } from "../ports/playground-host.port.js";
import type { IPlaygroundPreviewPort } from "../ports/playground-preview.port.js";
import type { IPlaygroundSourcePort } from "../ports/playground-source.port.js";
import type { ITypeScriptTranspilerPort } from "../ports/typescript-transpiler.port.js";
import { buildCodePlaygroundPreviewDocument } from "../use-cases/build-code-playground-preview.use-case.js";
import { downloadCodePlaygroundArchive } from "../use-cases/download-code-playground-archive.use-case.js";
import { loadCodePlaygroundSession } from "../use-cases/load-code-playground-session.use-case.js";

export class CodePlaygroundLifecycle extends PickLifecycleManager<CodePlayground> {
  private sourceLoadVersion = 0;

  constructor(
    private readonly sourcePort: IPlaygroundSourcePort,
    private readonly transpilerPort: ITypeScriptTranspilerPort,
    private readonly previewPort: IPlaygroundPreviewPort,
    private readonly downloadPort: IPlaygroundDownloadPort,
    private readonly hostPort: IPlaygroundHostPort,
  ) {
    super();
  }

  protected onComponentReady(component: CodePlayground): void {
    const session = component.getSession();
    if (session) {
      component.mountSession(session, this.hostPort.readEditorTheme());
      const initialCodeOverride = component.takePendingCodeOverride();
      if (initialCodeOverride !== null) {
        component.setPrimaryTypeScriptCode(initialCodeOverride);
      }
      this.runPlayground(component);
    }

    this.addSubscription(
      component.getPropertyObservable("locale").subscribe(() => {
        if (!component.hasHydratedSession()) {
          return;
        }
        this.runPlayground(component);
      }),
    );

    this.addSubscription(
      component.getPropertyObservable("src").subscribe(() => {
        const nextSrc = component.getRequestedSrc();
        if (!nextSrc || nextSrc === component.getLoadedSrc()) {
          return;
        }

        void this.reloadSource(component, nextSrc);
      }),
    );

    this.addSubscription(
      component
        .getPropertyObservable("codeReplaceRequestVersion")
        .subscribe(() => {
          const code = component.takePendingCodeOverride();
          if (code === null) {
            return;
          }

          component.setPrimaryTypeScriptCode(code);
          this.runPlayground(component);
        }),
    );

    this.addSubscription(
      component.getPropertyObservable("runRequestVersion").subscribe(() => {
        this.runPlayground(component);
      }),
    );

    this.addSubscription(
      component.getPropertyObservable("resetRequestVersion").subscribe(() => {
        component.restoreInitialCode();
        this.runPlayground(component);
      }),
    );

    this.addSubscription(
      component
        .getPropertyObservable("downloadRequestVersion")
        .subscribe(() => {
          void this.downloadPlayground(component);
        }),
    );

    this.addSubscription(
      this.hostPort.observeThemeChanges(() => {
        const theme = this.hostPort.readEditorTheme();
        component.reconfigureEditorTheme(theme);
        this.runPlayground(component);
      }),
    );
  }

  protected override onComponentDestroy(component: CodePlayground): void {
    component.disposeSurface();
  }

  private async reloadSource(
    component: CodePlayground,
    src: string,
  ): Promise<void> {
    const loadVersion = ++this.sourceLoadVersion;
    component.applySourceLoadStart(src);
    component.resetSurface(this.hostPort.readEditorTheme());

    try {
      const session = await loadCodePlaygroundSession(
        src,
        this.sourcePort,
        this.transpilerPort,
      );

      if (loadVersion !== this.sourceLoadVersion) {
        return;
      }

      component.applyLoadedSession(session);
      component.mountSession(session, this.hostPort.readEditorTheme());
      this.runPlayground(component);
    } catch (error) {
      if (loadVersion !== this.sourceLoadVersion) {
        return;
      }

      component.reportError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private runPlayground(component: CodePlayground): void {
    const session = component.getSession();
    if (!session) {
      return;
    }

    component.clearError();

    try {
      component.renderPreview(
        buildCodePlaygroundPreviewDocument(
          session,
          component.snapshotTabs(),
          component.resolveLocale(),
          this.hostPort.readEditorTheme(),
          this.transpilerPort,
          this.previewPort,
        ),
      );
    } catch (error) {
      component.reportError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async downloadPlayground(component: CodePlayground): Promise<void> {
    const session = component.getSession();
    if (!session) {
      return;
    }

    try {
      await downloadCodePlaygroundArchive(
        session,
        component.snapshotTabs(),
        component.resolveLocale(),
        this.downloadPort,
      );
    } catch (error) {
      component.reportError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
