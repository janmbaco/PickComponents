import { existsSync } from "node:fs";
import { isAbsolute, posix, relative, resolve, sep, win32 } from "node:path";

export type StaticAssetPathResolution =
  | {
      readonly ok: true;
      readonly absolutePath: string;
    }
  | {
      readonly ok: false;
      readonly statusCode: 403 | 404;
    };

export function resolveStaticAssetPath(
  rootDirectory: string,
  requestPath: string,
  defaultAssetPath: string,
): StaticAssetPathResolution {
  const decodedPath = decodeRequestPath(requestPath);
  if (decodedPath === null || hasNullByte(decodedPath)) {
    return forbidden();
  }

  const relativeRequestPath = toRelativeAssetPath(
    decodedPath === "/" ? defaultAssetPath : decodedPath,
  );
  if (relativeRequestPath === null) {
    return forbidden();
  }

  if (hasTraversalSegment(relativeRequestPath)) {
    return forbidden();
  }

  const normalizedRequestPath = posix.normalize(relativeRequestPath);
  if (escapesViaTraversal(normalizedRequestPath)) {
    return forbidden();
  }

  const absoluteRoot = resolve(rootDirectory);
  const absolutePath = resolve(absoluteRoot, normalizedRequestPath);
  if (!isInsideDirectory(absoluteRoot, absolutePath)) {
    return forbidden();
  }

  if (!existsSync(absolutePath)) {
    return { ok: false, statusCode: 404 };
  }

  return { ok: true, absolutePath };
}

function decodeRequestPath(requestPath: string): string | null {
  let decodedPath = requestPath;

  for (let attempt = 0; attempt < 8; attempt++) {
    let nextPath: string;
    try {
      nextPath = decodeURIComponent(decodedPath);
    } catch {
      return null;
    }

    if (nextPath === decodedPath) {
      return decodedPath;
    }
    decodedPath = nextPath;
  }

  return null;
}

function toRelativeAssetPath(assetPath: string): string | null {
  if (assetPath.includes("\\") || assetPath.startsWith("//")) {
    return null;
  }

  const withoutUrlRoot = assetPath.startsWith("/")
    ? assetPath.slice(1)
    : assetPath;

  if (
    !withoutUrlRoot ||
    isAbsolute(withoutUrlRoot) ||
    win32.isAbsolute(withoutUrlRoot) ||
    /^[A-Za-z]:/.test(withoutUrlRoot)
  ) {
    return null;
  }

  return withoutUrlRoot;
}

function hasTraversalSegment(relativeRequestPath: string): boolean {
  return relativeRequestPath
    .split(posix.sep)
    .some((segment) => segment === "..");
}

function escapesViaTraversal(normalizedRequestPath: string): boolean {
  return (
    normalizedRequestPath === ".." ||
    normalizedRequestPath.startsWith(`..${posix.sep}`)
  );
}

function isInsideDirectory(
  rootDirectory: string,
  absolutePath: string,
): boolean {
  const rootWithSeparator = rootDirectory.endsWith(sep)
    ? rootDirectory
    : `${rootDirectory}${sep}`;
  const relativePath = relative(rootDirectory, absolutePath);

  return (
    absolutePath === rootDirectory ||
    (absolutePath.startsWith(rootWithSeparator) &&
      !!relativePath &&
      relativePath !== ".." &&
      !relativePath.startsWith(`..${sep}`) &&
      !isAbsolute(relativePath))
  );
}

function hasNullByte(value: string): boolean {
  return value.includes("\0");
}

function forbidden(): StaticAssetPathResolution {
  return { ok: false, statusCode: 403 };
}
