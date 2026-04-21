const DEFAULT_OPTIONS = {
  spaFallbackPath: "/index.html",
  cors: true,
};

const IMMUTABLE_ASSET_PATTERN =
  /\.(?:css|png|jpe?g|svg|gif|ico|webp|avif|woff2?)$/i;

const JS_ASSET_PATTERN = /\.m?js$/i;

export function createPickPublicRouteWorker(options = {}) {
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };

  return {
    async fetch(request, env) {
      return handlePickPublicRouteRequest(request, env, resolvedOptions);
    },
  };
}

export async function handlePickPublicRouteRequest(request, env, options = {}) {
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };
  const assetBinding = resolveAssetBinding(env);

  if (!assetBinding) {
    return new Response("Missing ASSETS binding for Pick public routes.", {
      status: 500,
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }

  const requestUrl = new URL(request.url);
  const candidates = buildPublicRouteCandidates(
    requestUrl.pathname,
    resolvedOptions,
  );

  for (const candidatePath of candidates) {
    const assetRequest = createAssetRequest(request, candidatePath);
    const response = await assetBinding.fetch(assetRequest);

    if (response.status === 404) {
      continue;
    }

    return withDeliveryHeaders(
      response,
      candidatePath,
      requestUrl.pathname,
      resolvedOptions,
    );
  }

  return withDeliveryHeaders(
    new Response("404 Not Found", { status: 404 }),
    requestUrl.pathname,
    requestUrl.pathname,
    resolvedOptions,
  );
}

export function buildPublicRouteCandidates(pathname, options = {}) {
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === "/") {
    return ["/index.html"];
  }

  if (hasFileExtension(normalizedPath)) {
    return [normalizedPath];
  }

  const routePath = normalizedPath.endsWith("/")
    ? normalizedPath.slice(0, -1)
    : normalizedPath;
  const candidates = [`${routePath}/index.html`, routePath];

  if (resolvedOptions.spaFallbackPath) {
    candidates.push(normalizePathname(resolvedOptions.spaFallbackPath));
  }

  return [...new Set(candidates)];
}

function resolveAssetBinding(env) {
  if (env?.ASSETS && typeof env.ASSETS.fetch === "function") {
    return env.ASSETS;
  }

  return null;
}

function createAssetRequest(sourceRequest, pathname) {
  const sourceUrl = new URL(sourceRequest.url);
  sourceUrl.pathname = pathname;
  sourceUrl.search = "";

  return new Request(sourceUrl.toString(), sourceRequest);
}

function withDeliveryHeaders(response, servedPath, originalPath, options) {
  const headers = new Headers(response.headers);

  if (options.cors) {
    headers.set("Access-Control-Allow-Origin", "*");
  }

  if (servedPath.endsWith(".html")) {
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    headers.set(
      "X-Pick-Delivery",
      deliveryModeForHtml(servedPath, originalPath),
    );

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "text/html; charset=utf-8");
    }
  } else if (JS_ASSET_PATTERN.test(servedPath)) {
    headers.set("Cache-Control", "no-cache");
    headers.set("X-Pick-Delivery", "asset");
  } else if (IMMUTABLE_ASSET_PATTERN.test(servedPath)) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Pick-Delivery", "asset");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function deliveryModeForHtml(servedPath, originalPath) {
  if (servedPath === "/index.html" && normalizePathname(originalPath) !== "/") {
    return "spa-fallback";
  }

  return "public-html";
}

function hasFileExtension(pathname) {
  const lastSegment = pathname.split("/").pop() ?? "";
  return /\.[^/.]+$/.test(lastSegment);
}

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  const prefixed = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return prefixed.replace(/\/{2,}/g, "/");
}

export default createPickPublicRouteWorker();
