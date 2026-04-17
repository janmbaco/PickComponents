/**
 * Prepares browser-ready runtime assets for the examples playground.
 *
 * Runtime assets are emitted under examples/vendor/ and consumed exclusively
 * by `<code-playground>` via an importmap in the iframe srcdoc.
 */
import * as esbuild from "esbuild";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);

const vendorOutDir = "examples/vendor";
rmSync(vendorOutDir, { recursive: true, force: true });
mkdirSync(vendorOutDir, { recursive: true });

// Copy TypeScript standalone for on-demand loading by <code-playground>
await ensureBrowserRuntimeAsset({
  label: "Playground runtime",
  sourcePath: "dist/browser/pick-components.js",
  outputPath: join(vendorOutDir, "pick-components.js"),
  fallbackEntryPoint: "src/index.ts",
});

await ensureBrowserRuntimeAsset({
  label: "Playground bootstrap runtime",
  sourcePath: "dist/browser/pick-components-bootstrap.js",
  outputPath: join(vendorOutDir, "pick-components-bootstrap.js"),
  fallbackEntryPoint: "src/bootstrap.ts",
});

await ensureInjectKitRuntime(join(vendorOutDir, "injectkit.js"));

function stripTrailingSourceMapComment(filePath) {
  const source = readFileSync(filePath, "utf-8");
  const sanitized = source.replace(/\n\/\/# sourceMappingURL=.*\s*$/u, "\n");
  if (sanitized !== source) {
    writeFileSync(filePath, sanitized);
  }
}

try {
  copyTextAsset(
    "./node_modules/typescript/lib/typescript.js",
    join(vendorOutDir, "typescript-standalone.js"),
  );
  console.log(
    `✅ TypeScript standalone copied (${join(vendorOutDir, "typescript-standalone.js")})`,
  );
} catch {
  console.warn("⚠️  typescript not found — run npm install");
}

// Copy demo source files so <code-playground src="..."> can fetch them

const examplesOutDir = "examples/playground-examples";
const demosSrcDir = "examples/src/demos";
const requiredVariantDirs = ["en-light", "en-dark", "es-light", "es-dark"];
rmSync(examplesOutDir, { recursive: true, force: true });
mkdirSync(examplesOutDir, { recursive: true });

let totalCopied = 0;
for (const demoEntry of readdirSync(demosSrcDir, { withFileTypes: true })) {
  if (!demoEntry.isDirectory()) {
    continue;
  }

  const demoId = demoEntry.name;
  const demoDir = join(demosSrcDir, demoId);

  for (const variantDirName of requiredVariantDirs) {
    const variantDir = join(demoDir, "variants", variantDirName);
    const tabsJsonPath = join(variantDir, "tabs.json");

    if (!existsSync(tabsJsonPath)) {
      throw new Error(
        `Missing variant manifest ${tabsJsonPath}. Each playground demo must provide en-light, en-dark, es-light and es-dark variants.`,
      );
    }

    const manifest = JSON.parse(readFileSync(tabsJsonPath, "utf-8"));
    const primaryExampleFile = manifest.tabs.find((tab) =>
      tab.file.endsWith(".example.ts"),
    )?.file;

    if (!primaryExampleFile) {
      throw new Error(
        `Variant ${variantDir} must expose one *.example.ts file in tabs.json.`,
      );
    }

    const prefix = primaryExampleFile.replace(".example.ts", "");
    const outputNameForManifestFile = (tabFile) =>
      tabFile === `${prefix}.example.ts` ? tabFile : `${prefix}.${tabFile}`;
    const variantOutDir = join(examplesOutDir, demoId, variantDirName);
    mkdirSync(variantOutDir, { recursive: true });

    for (const tab of manifest.tabs) {
      const tabSrc = join(variantDir, tab.file);
      if (!existsSync(tabSrc)) {
        throw new Error(
          `Missing tab source ${tabSrc} referenced by ${tabsJsonPath}.`,
        );
      }

      const dest = join(variantOutDir, outputNameForManifestFile(tab.file));
      writeFileSync(dest, readFileSync(tabSrc, "utf-8"));
      totalCopied++;
    }

    writeFileSync(
      join(variantOutDir, `${prefix}.tabs.json`),
      readFileSync(tabsJsonPath, "utf-8"),
    );
    totalCopied++;
  }
}
console.log(
  `✅ Playground examples copied (${totalCopied} files → ${examplesOutDir}/)`,
);

async function ensureBrowserRuntimeAsset({
  label,
  sourcePath,
  outputPath,
  fallbackEntryPoint,
}) {
  if (existsSync(sourcePath)) {
    copyTextAsset(sourcePath, outputPath);
    console.log(`✅ ${label} copied (${outputPath})`);
    return;
  }

  await esbuild.build({
    entryPoints: [fallbackEntryPoint],
    bundle: true,
    outfile: outputPath,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: false,
    sourcemap: false,
  });

  console.log(`✅ ${label} bundled (${outputPath})`);
}

async function ensureInjectKitRuntime(outputPath) {
  const browserReadyInjectKit = "../InjectKit/dist/browser/injectkit.js";
  if (existsSync(browserReadyInjectKit)) {
    copyTextAsset(browserReadyInjectKit, outputPath);
    console.log(`✅ InjectKit runtime copied (${outputPath})`);
    return;
  }

  const injectKitSourceEntry = "../InjectKit/src/index.ts";
  if (existsSync(injectKitSourceEntry)) {
    await bundleRuntimeAsset({
      label: "InjectKit runtime",
      entryPoint: injectKitSourceEntry,
      outputPath,
    });
    return;
  }

  const scopedBrowserEntryPoint = resolvePackageEntry(
    "@janmbaco/injectkit/browser",
  );
  if (scopedBrowserEntryPoint) {
    copyTextAsset(scopedBrowserEntryPoint, outputPath);
    console.log(`✅ InjectKit runtime copied (${outputPath})`);
    return;
  }

  const scopedPackageEntryPoint = resolvePackageEntry("@janmbaco/injectkit");
  if (scopedPackageEntryPoint) {
    await bundleRuntimeAsset({
      label: "InjectKit runtime",
      entryPoint: scopedPackageEntryPoint,
      outputPath,
    });
    return;
  }

  const vendoredBrowserReadyInjectKit = "scripts/vendor/injectkit.js";
  if (existsSync(vendoredBrowserReadyInjectKit)) {
    copyTextAsset(vendoredBrowserReadyInjectKit, outputPath);
    console.log(`✅ InjectKit runtime copied (${outputPath})`);
    return;
  }

  throw new Error(
    "Missing InjectKit runtime. Expected ../InjectKit/dist/browser/injectkit.js, ../InjectKit/src/index.ts, installed package '@janmbaco/injectkit', or scripts/vendor/injectkit.js.",
  );
}

function resolvePackageEntry(packageName) {
  try {
    return require.resolve(packageName);
  } catch {
    return null;
  }
}

async function bundleRuntimeAsset({ label, entryPoint, outputPath }) {
  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    outfile: outputPath,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: false,
    sourcemap: false,
  });
  console.log(`✅ ${label} bundled (${outputPath})`);
}

function copyTextAsset(sourcePath, outputPath) {
  copyFileSync(sourcePath, outputPath);
  stripTrailingSourceMapComment(outputPath);
}
