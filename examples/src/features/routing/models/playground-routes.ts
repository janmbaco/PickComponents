export const PLAYGROUND_LOCALES = ["es", "en"] as const;
export type PlaygroundLocale = (typeof PLAYGROUND_LOCALES)[number];

export const PLAYGROUND_EXAMPLE_IDS = [
  "01-hello",
  "02-counter",
  "03-bindings",
  "04-template-expressions",
  "05-computed-bindings",
  "06-pick-component",
  "07-pick-actions",
  "07b-pick-actions-pick",
  "08-pick-select",
  "09-pick-for",
  "10-forms",
  "11-di",
  "12-api",
  "13-dashboard",
  "14-pick",
] as const;

export type ExampleId = (typeof PLAYGROUND_EXAMPLE_IDS)[number];

const EXAMPLE_ID_SET = new Set<string>(PLAYGROUND_EXAMPLE_IDS);

export const DEFAULT_EXAMPLE_ID: ExampleId = "01-hello";

export function resolvePlaygroundLocale(
  rawValue?: string | null,
): PlaygroundLocale {
  return rawValue === "en" ? "en" : "es";
}

export function hasPlaygroundLocalePrefix(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] === "es" || segments[0] === "en";
}

export function localeFromPlaygroundPath(pathname: string): PlaygroundLocale {
  const segments = pathname.split("/").filter(Boolean);
  return resolvePlaygroundLocale(segments[0]);
}

export function exampleIdFromPlaygroundPath(
  pathname: string,
): ExampleId | null {
  const segments = pathname.split("/").filter(Boolean);
  const candidate = segments[1];
  return EXAMPLE_ID_SET.has(candidate) ? (candidate as ExampleId) : null;
}

export function buildPlaygroundHomePath(locale: PlaygroundLocale): string {
  return `/${locale}`;
}

export function buildExamplePath(
  locale: PlaygroundLocale,
  exampleId: ExampleId,
): string {
  return `/${locale}/${exampleId}`;
}

export function translatePlaygroundPath(
  pathname: string,
  targetLocale: PlaygroundLocale,
): string {
  if (!hasPlaygroundLocalePrefix(pathname)) {
    return buildPlaygroundHomePath(targetLocale);
  }

  const exampleId = exampleIdFromPlaygroundPath(pathname);
  return exampleId
    ? buildExamplePath(targetLocale, exampleId)
    : buildPlaygroundHomePath(targetLocale);
}
