import {
  buildCodePlaygroundSessionState,
  type CodePlaygroundSessionState,
} from "../models/code-playground.session.js";
import type { IPlaygroundSourcePort } from "../ports/playground-source.port.js";
import type { ITypeScriptTranspilerPort } from "../ports/typescript-transpiler.port.js";

export async function loadCodePlaygroundSession(
  src: string,
  sourcePort: IPlaygroundSourcePort,
  transpilerPort: ITypeScriptTranspilerPort,
): Promise<CodePlaygroundSessionState> {
  const [source] = await Promise.all([
    sourcePort.loadSource(src),
    transpilerPort.ensureReady(),
  ]);

  return buildCodePlaygroundSessionState(src, source);
}
