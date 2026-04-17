// ── api.lifecycle.ts ─────────────────────────────────
// Extends PickLifecycleManager — the MEDIATOR that runs AFTER render.
//
// The component emits a point-in-time intent with createIntent().
// The LifecycleManager subscribes to that intent, calls DogService,
// and writes the resulting view state back into the component.

import { PickLifecycleManager } from "pick-components";
import { DogService } from "./services.js";
import type { ApiExample } from "./api.example.js";

export class ApiLifecycle extends PickLifecycleManager<ApiExample> {
  constructor(private readonly dogService: DogService) {
    super();
    if (!dogService) throw new Error("DogService is required");
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
