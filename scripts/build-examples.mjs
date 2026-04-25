import * as esbuild from "esbuild";
import { access, copyFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";

// ── Build playground ESM bundles (consumed by <code-playground> iframes) ──
await import("./build-playground-lib.mjs");

const entryPoint = "examples/src/main.ts";

const canRead = async (path) => {
  try {
    await access(path, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
};

const hasEntryPoint = await canRead(entryPoint);

if (!hasEntryPoint) {
  console.warn(`⚠️  Skipping examples bundle: missing ${entryPoint}`);
} else {
  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    outfile: "examples/bundle.js",
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    sourcemap: true,
    alias: {
      "pick-components/bootstrap": "./src/bootstrap.ts",
      "pick-components": "./src/index.ts",
    },
    loader: {
      ".html": "text",
      ".css": "text",
      ".example.ts": "text",
    },
  });

  console.log("✅ Examples bundled (examples/bundle.js)");
}

// Copy Pico CSS to examples folder
try {
  await copyFile(
    "./node_modules/@picocss/pico/css/pico.min.css",
    "./examples/pico.min.css",
  );
  console.log("✅ Pico CSS copied (examples/pico.min.css)");
} catch {
  console.warn("⚠️  Pico CSS not found — run npm install");
}

const { prerenderExamples } = await import("./prerender-examples.mjs");
await prerenderExamples();
