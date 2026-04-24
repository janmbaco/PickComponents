declare global {
  interface Window {
    __PICK_PLAYGROUND_BASE_PATH__?: string;
  }
}

export function normalizePlaygroundBasePath(
  value?: string | null,
): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }

  return `/${trimmed.replace(/^\/+|\/+$/gu, "")}`;
}

export function resolvePlaygroundBasePath(): string {
  if (typeof window !== "undefined") {
    const configured = normalizePlaygroundBasePath(
      window.__PICK_PLAYGROUND_BASE_PATH__,
    );
    if (configured) {
      return configured;
    }

    return inferPlaygroundBasePath(window.location.pathname);
  }

  const configured = normalizePlaygroundBasePath(
    (globalThis as { __PICK_PLAYGROUND_BASE_PATH__?: string })
      .__PICK_PLAYGROUND_BASE_PATH__,
  );
  return configured;
}

export function inferPlaygroundBasePath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  if (!firstSegment || firstSegment === "es" || firstSegment === "en") {
    return "";
  }

  return `/${firstSegment}`;
}

export function stripPlaygroundBasePath(
  pathname: string,
  basePath = resolvePlaygroundBasePath(),
): string {
  const normalizedPathname = normalizePublicPath(pathname);
  const normalizedBase = normalizePlaygroundBasePath(basePath);

  if (!normalizedBase) {
    return normalizedPathname;
  }

  if (normalizedPathname === normalizedBase) {
    return "/";
  }

  if (normalizedPathname.startsWith(`${normalizedBase}/`)) {
    return normalizedPathname.slice(normalizedBase.length) || "/";
  }

  return normalizedPathname;
}

export function withPlaygroundBasePath(
  path: string,
  basePath = resolvePlaygroundBasePath(),
): string {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/iu.test(path)) {
    return path;
  }

  const normalizedBase = normalizePlaygroundBasePath(basePath);
  const normalizedPath = normalizePublicPath(path);

  if (!normalizedBase) {
    return normalizedPath;
  }

  if (normalizedPath === "/") {
    return `${normalizedBase}/`;
  }

  return `${normalizedBase}${normalizedPath}`;
}

function normalizePublicPath(path: string): string {
  const [pathname, suffix = ""] = splitPathSuffix(path);
  const cleanPathname = pathname
    ? `/${pathname.replace(/^\/+/u, "").replace(/\/{2,}/gu, "/")}`
    : "/";

  return `${cleanPathname}${suffix}`;
}

function splitPathSuffix(path: string): [string, string?] {
  const suffixIndex = path.search(/[?#]/u);
  if (suffixIndex === -1) {
    return [path];
  }

  return [path.slice(0, suffixIndex), path.slice(suffixIndex)];
}
