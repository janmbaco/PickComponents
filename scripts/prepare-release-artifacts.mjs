import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(__dirname, "..");
const packageJsonPath = join(repositoryRoot, "package.json");
const browserDistDirectory = join(repositoryRoot, "dist", "browser");

const releaseFiles = [
  "pick-components.js",
  "pick-components.js.map",
  "pick-components.min.js",
  "pick-components.min.js.map",
  "pick-components-bootstrap.js",
  "pick-components-bootstrap.js.map",
  "pick-components-bootstrap.min.js",
  "pick-components-bootstrap.min.js.map",
];

async function loadPackageVersion() {
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  return packageJson.version;
}

async function prepareReleaseArtifacts() {
  const version = await loadPackageVersion();
  const releaseDirectory = join(
    repositoryRoot,
    ".release-artifacts",
    `v${version}`,
  );

  await rm(releaseDirectory, { recursive: true, force: true });
  await mkdir(releaseDirectory, { recursive: true });

  const checksums = [];
  for (const fileName of releaseFiles) {
    const sourcePath = join(browserDistDirectory, fileName);
    const targetPath = join(releaseDirectory, fileName);
    const fileBuffer = await readFile(sourcePath);

    await copyFile(sourcePath, targetPath);
    checksums.push(
      `${createHash("sha256").update(fileBuffer).digest("hex")}  ${fileName}`,
    );
  }

  await copyFile(join(repositoryRoot, "LICENSE"), join(releaseDirectory, "LICENSE"));
  await writeFile(join(releaseDirectory, "SHA256SUMS"), `${checksums.join("\n")}\n`);
  await writeFile(
    join(releaseDirectory, "README.txt"),
    [
      `pick-components browser release v${version}`,
      "",
      "Contents:",
      "- Non-minified browser-ready ESM bundles",
      "- Minified browser-ready ESM bundles",
      "- Source maps for all browser bundles",
      "- SHA256SUMS for integrity verification",
      "",
      "These artifacts are intended for GitHub Releases and direct browser/CDN distribution.",
    ].join("\n"),
  );

  console.log(`Prepared GitHub release artifacts in ${releaseDirectory}`);
}

await prepareReleaseArtifacts();
