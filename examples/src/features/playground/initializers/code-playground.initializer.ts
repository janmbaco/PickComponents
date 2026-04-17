import { PickInitializer } from "pick-components";
import type { CodePlayground } from "../components/code-playground.pick.js";
import type { IPlaygroundSourcePort } from "../ports/playground-source.port.js";
import type { ITypeScriptTranspilerPort } from "../ports/typescript-transpiler.port.js";
import { loadCodePlaygroundSession } from "../use-cases/load-code-playground-session.use-case.js";

export class CodePlaygroundInitializer extends PickInitializer<CodePlayground> {
  constructor(
    private readonly sourcePort: IPlaygroundSourcePort,
    private readonly transpilerPort: ITypeScriptTranspilerPort,
  ) {
    super();
  }

  protected async onInitialize(component: CodePlayground): Promise<boolean> {

    const src = component.getRequestedSrc();
    if (!src) {
      return true;
    }

    component.applySourceLoadStart(src);

    try {
      component.applyLoadedSession(
        await loadCodePlaygroundSession(
          src,
          this.sourcePort,
          this.transpilerPort,
        ),
      );
    } catch (error) {
      component.reportError(
        error instanceof Error ? error.message : String(error),
      );
    }

    return true;
  }
}
