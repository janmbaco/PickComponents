import apiStyles from "./api.styles.css";
import apiTemplate from "./api.template.html";
import {
  PickComponent,
  PickRender,
  Reactive,
  Listen,
  Services,
} from "pick-components";
import type { User } from "./services.js";

@PickRender({
  selector: "api-example",
  initializer: () => Services.get("ApiInitializer"),
  lifecycle: () => Services.get("ApiLifecycle"),
  skeleton: `
    <section class="panel" role="status" aria-live="polite">
      <p class="eyebrow">Lifecycle</p>
      <h3>API Integration</h3>
      <p aria-busy="true">Loading users...</p>
    </section>
  `,
  errorTemplate: '<p role="alert">Failed to load data.</p>',
  styles: apiStyles,
  template: apiTemplate,
})
export class ApiExample extends PickComponent {
  readonly dogImagesRequested$ = this.createIntent();

  @Reactive allUsers: User[] = [];
  @Reactive searchQuery = "";
  @Reactive dogsLoading = false;
  @Reactive dogImages: string[] = [];

  get filteredUsers(): User[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      return this.allUsers;
    }

    return this.allUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query),
    );
  }

  @Listen("#searchInput", "input")
  onSearch(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }

  requestDogImages(): void {
    this.dogImagesRequested$.notify();
  }
}
