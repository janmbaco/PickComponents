import { PickComponent, PickRender, Reactive } from "pick-components";
import { withPlaygroundBasePath } from "../models/playground-public-path.js";

@PickRender({
  selector: "playground-route-view",
  styles: `
    :host {
      display: flex;
      flex: 1;
      min-width: 0;
      min-height: 0;
    }

    code-playground {
      display: flex;
      flex: 1;
      min-width: 0;
      min-height: 0;
    }
  `,
  template: `
    <code-playground
      locale="{{locale}}"
      src="{{src}}"
    ></code-playground>
  `,
})
export class PlaygroundRouteView extends PickComponent {
  @Reactive locale = "en";
  @Reactive src = withPlaygroundBasePath(
    "/playground-examples/01-hello/en-light/hello.example.ts",
  );
}
