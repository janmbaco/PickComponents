/**
 * Declares the TypeScript standalone global loaded on demand via a script tag.
 * This avoids bundling the ~9 MB TypeScript compiler into the examples bundle.
 */
declare const ts: {
  transpileModule(
    input: string,
    transpileOptions: {
      compilerOptions?: Record<string, unknown>;
      fileName?: string;
    },
  ): {
    outputText: string;
    diagnostics?: Array<{ messageText: string | object }>;
  };
  ScriptTarget: Record<string, number>;
  ModuleKind: Record<string, number>;
};

export const TYPESCRIPT_TRANSPILER_PORT_TOKEN = "TypeScriptTranspilerPort";

export interface ITypeScriptTranspilerPort {
  ensureReady(): Promise<void>;
  transpile(code: string, filename: string): string;
}

let tsLoadPromise: Promise<void> | null = null;

export class BrowserTypeScriptTranspilerPort implements ITypeScriptTranspilerPort {
  ensureReady(): Promise<void> {
    if (typeof globalThis !== "undefined" && "ts" in globalThis) {
      return Promise.resolve();
    }
    if (tsLoadPromise) {
      return tsLoadPromise;
    }
    tsLoadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/vendor/typescript-standalone.js";
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load TypeScript standalone"));
      document.head.appendChild(script);
    });
    return tsLoadPromise;
  }

  transpile(code: string, filename: string): string {
    const compilerOptions: Record<string, unknown> = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      // Keep TC39 decorator emit so @Reactive updates notify bindings.
      experimentalDecorators: false,
    };

    const result = ts.transpileModule(code, {
      compilerOptions,
      fileName: filename,
    });
    if (result.diagnostics?.length) {
      const message = result.diagnostics
        .map((diagnostic) =>
          typeof diagnostic.messageText === "string"
            ? diagnostic.messageText
            : JSON.stringify(diagnostic.messageText),
        )
        .join("\n");
      throw new Error(message);
    }

    return result.outputText;
  }
}
