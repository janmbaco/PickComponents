import { navigate } from "pick-components";

export const PLAYGROUND_ROUTING_PORT_TOKEN = "PlaygroundRoutingPort";

export interface IPlaygroundRoutingPort {
  getCurrentPath(): string;
  replacePath(path: string): void;
  subscribeToRouteChanges(listener: (path: string) => void): () => void;
}

const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

export class BrowserPlaygroundRoutingPort implements IPlaygroundRoutingPort {
  getCurrentPath(): string {
    if (!isBrowser) {
      return "/";
    }

    return window.location.pathname;
  }

  replacePath(path: string): void {
    if (!isBrowser) {
      return;
    }

    navigate(path, { replace: true });
  }

  subscribeToRouteChanges(listener: (path: string) => void): () => void {
    if (!isBrowser) {
      return () => {};
    }

    let lastPath = window.location.pathname;
    const notify = (path: string): void => {
      if (path === lastPath) {
        return;
      }

      lastPath = path;
      listener(path);
    };

    const onRouteChange = (event: Event): void => {
      const detail = (event as CustomEvent<{ path?: string }>).detail;
      notify(detail?.path ?? window.location.pathname);
    };
    const onPopState = (): void => notify(window.location.pathname);

    document.addEventListener("route-change", onRouteChange);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("route-change", onRouteChange);
      window.removeEventListener("popstate", onPopState);
    };
  }
}
