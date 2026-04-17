import pickStyles from "./pick.styles.css";
import pickTemplate from "./pick.template.html";
import {
  Pick,
  Services,
  type IIntentSignal,
  type InlineContext,
  type PickComponent,
} from "pick-components";
import type { CatalogService, Product } from "./services.js";

interface CatalogState {
  products: Product[];
  refreshing: boolean;
}

type CatalogComponent = PickComponent &
  CatalogState & {
    refreshRequested$: IIntentSignal;
  };

@Pick<CatalogState>("pick-example", (ctx: InlineContext<CatalogState>) => {
  ctx.state({ products: [], refreshing: false });
  ctx.intent("refreshRequested$");

  ctx.initializer(
    async function (component, deps) {
      component.products = await deps!.catalog.loadCatalog();
    },
    () => ({ catalog: Services.get<CatalogService>("CatalogService") }),
  );

  ctx.lifecycle(
    {
      onInit(component, subs, deps) {
        const catalog = deps!.catalog;
        const host = component as CatalogComponent;

        catalog.startStockUpdates();
        subs.addSubscription(
          catalog.onStockChange((updated) => {
            component.products = updated;
          }),
        );
        subs.addSubscription(
          host.refreshRequested$.subscribe(() => {
            void refreshCatalog(host, catalog);
          }),
        );
      },
      onDestroy(_component, _subs, deps) {
        deps!.catalog.stopStockUpdates();
      },
    },
    () => ({ catalog: Services.get<CatalogService>("CatalogService") }),
  );

  ctx.on({
    refresh() {
      (this as CatalogComponent).refreshRequested$.notify();
    },
  });

  ctx.skeleton('<p aria-busy="true">Loading catalog...</p>');
  ctx.errorTemplate('<p role="alert">Failed to load catalog.</p>');
  ctx.css(pickStyles);
  ctx.html(pickTemplate);
})
class PickExample {}

async function refreshCatalog(
  component: CatalogComponent,
  catalog: CatalogService,
): Promise<void> {
  component.refreshing = true;
  component.products = await catalog.loadCatalog();
  component.refreshing = false;
}
