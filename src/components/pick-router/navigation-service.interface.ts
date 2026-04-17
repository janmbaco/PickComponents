/**
 * Defines the responsibility of providing programmatic navigation for SPAs.
 */
export interface INavigationService {
  /**
   * Navigate to a route programmatically.
   *
   * @param path - Target pathname (e.g., '/users/123')
   * @param options - Navigation options
   * @param options.replace - When true, uses replaceState instead of pushState
   */
  navigate(path: string, options?: { replace?: boolean }): void;

  /**
   * Returns the current route pathname.
   *
   * @returns The current pathname string (e.g., '/users/123')
   */
  getCurrentPath(): string;

  /**
   * Subscribes to route changes.
   *
   * @param listener - Callback invoked after the current path changes
   * @returns Unsubscribe function to remove the listener
   */
  subscribe(listener: () => void): () => void;
}
