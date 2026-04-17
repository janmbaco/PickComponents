import type { INavigationService } from "./navigation-service.interface.js";
import { Services } from "../../providers/service-provider.js";

/**
 * SSR guard — ensures navigation helpers only execute in browser environments.
 */
function isBrowserEnvironment(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * Implements the responsibility of providing browser-based programmatic navigation.
 *
 * @description
 * Uses the History API for pushState/replaceState navigation and dispatches
 * a synthetic popstate event so INavigationService subscribers pick up the
 * change.
 * No-op in non-browser environments (SSR safe).
 */
export class BrowserNavigationService implements INavigationService {
  /**
   * Navigate to a route programmatically.
   *
   * @param path - Target pathname (e.g., '/users/123')
   * @param options - Navigation options
   * @param options.replace - When true, uses replaceState instead of pushState
   */
  navigate(path: string, options: { replace?: boolean } = {}): void {
    if (!isBrowserEnvironment()) return;

    if (options.replace) {
      window.history.replaceState({}, "", path);
    } else {
      window.history.pushState({}, "", path);
    }

    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  /**
   * Returns the current browser pathname.
   *
   * @returns The current pathname string, or '/' in non-browser environments
   */
  getCurrentPath(): string {
    if (!isBrowserEnvironment()) return "/";
    return window.location.pathname;
  }

  /**
   * Subscribes to browser route changes.
   *
   * @param listener - Callback invoked on popstate
   * @returns Unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    if (!isBrowserEnvironment()) return () => {};

    const handler = () => {
      listener();
    };
    window.addEventListener("popstate", handler);
    return () => {
      window.removeEventListener("popstate", handler);
    };
  }
}

/**
 * Convenience wrapper that delegates to the registered INavigationService.
 * Allows framework users to call `navigate('/path')` without resolving the service manually.
 *
 * @param path - Target pathname
 * @param options - Navigation options
 *
 * @example
 * ```typescript
 * import { navigate } from 'pickcomponents';
 * navigate('/users/123');
 * navigate('/home', { replace: true });
 * ```
 */
export function navigate(
  path: string,
  options: { replace?: boolean } = {},
): void {
  Services.get<INavigationService>("INavigationService").navigate(
    path,
    options,
  );
}

/**
 * Convenience wrapper that delegates to the registered INavigationService.
 *
 * @returns The current pathname string
 *
 * @example
 * ```typescript
 * import { getCurrentPath } from 'pickcomponents';
 * const path = getCurrentPath(); // e.g. '/users/123'
 * ```
 */
export function getCurrentPath(): string {
  return Services.get<INavigationService>(
    "INavigationService",
  ).getCurrentPath();
}
