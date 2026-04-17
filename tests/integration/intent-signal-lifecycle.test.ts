import { test, expect } from "@playwright/test";
import { PickLifecycleManager } from "../../src/behaviors/pick-lifecycle-manager";
import { PickComponent } from "../../src/core/pick-component";

type RaceMode = "mass_start" | "time_trial";

class ModeSelectorComponent extends PickComponent {
  readonly modeRequested$ = this.createIntent<RaceMode>();

  requestMode(mode: RaceMode): void {
    this.modeRequested$.notify(mode);
  }
}

class RaceService {
  readonly modes: RaceMode[] = [];

  setMode(mode: RaceMode): void {
    this.modes.push(mode);
  }
}

class ModeSelectorLifecycle extends PickLifecycleManager<ModeSelectorComponent> {
  constructor(private readonly raceService: RaceService) {
    super();
  }

  protected onComponentReady(component: ModeSelectorComponent): void {
    this.addSubscription(
      component.modeRequested$.subscribe((mode) => {
        this.raceService.setMode(mode);
      }),
    );
  }
}

test.describe("IntentSignal lifecycle integration", () => {
  test("coordinates component intentions without requestVersion reactive state", () => {
    const component = new ModeSelectorComponent();
    const raceService = new RaceService();
    const lifecycle = new ModeSelectorLifecycle(raceService);

    lifecycle.startListening(component);
    component.requestMode("time_trial");

    expect(raceService.modes).toEqual(["time_trial"]);

    lifecycle.stopListening();
    component.requestMode("mass_start");

    expect(raceService.modes).toEqual(["time_trial"]);
  });
});
