// ── api.lifecycle.ts ─────────────────────────────────
// Extiende PickLifecycleManager: el MEDIADOR que corre DESPUÉS del render.
//
// El componente emite una intención puntual con createIntent().
// El LifecycleManager se suscribe a esa intención, llama a DogService
// y escribe el estado de vista resultante en el componente.

import { PickLifecycleManager } from "pick-components";
import { DogService } from "./services.js";
import type { ApiExample } from "./api.example.js";

export class ApiLifecycle extends PickLifecycleManager<ApiExample> {
  constructor(private readonly dogService: DogService) {
    super();
    if (!dogService) throw new Error("DogService es obligatorio");
  }

  protected onComponentReady(component: ApiExample): void {
    this.addSubscription(
      component.dogImagesRequested$.subscribe(() => {
        if (component.dogsLoading) {
          return;
        }

        void this.loadDogImages(component);
      }),
    );
  }

  private async loadDogImages(component: ApiExample): Promise<void> {
    component.dogsLoading = true;

    try {
      const nextImages = await this.dogService.getRandomImages(6);
      component.dogImages = [...component.dogImages, ...nextImages];
    } catch {
      if (component.dogImages.length === 0) {
        component.dogImages = [];
      }
    } finally {
      component.dogsLoading = false;
    }
  }
}
