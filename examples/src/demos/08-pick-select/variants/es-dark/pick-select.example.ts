import pickSelectStyles from "./pick-select.styles.css";
import { PickComponent, PickRender, Reactive, Listen } from "pick-components";

type PanelStatus = "none" | "ready" | "empty" | "error";

const STATUS_LABELS: Record<PanelStatus, string> = {
  none: "Sin rama",
  ready: "Preparado",
  empty: "Vacio",
  error: "Error",
};

@PickRender({
  selector: "pick-select-example",
  styles: pickSelectStyles,
  template: `
    <section class="panel">
      <header>
        <p class="eyebrow">Componente del framework</p>
        <h2>Pick Select</h2>
        <p>
          <code>&lt;pick-select&gt;</code> renderiza la rama <code>&lt;on&gt;</code>
          que coincide, y usa <code>&lt;otherwise&gt;</code> cuando ninguna coincide.
        </p>
      </header>

      <label class="control">
        Estado del panel
        <select id="statusSelect" aria-label="Estado del panel">
          <option value="none">Ninguna rama coincide</option>
          <option value="ready">Rama preparada</option>
          <option value="empty">Rama vacia</option>
          <option value="error">Rama de error</option>
        </select>
      </label>

      <p class="state">Estado actual: <strong>{{statusLabel}}</strong></p>

      <pick-select>
        <on condition="{{status === 'ready'}}">
          <article class="branch success">
            <strong>Listo para publicar</strong>
            <span>Esta rama aparece porque la condicion de preparado es verdadera.</span>
          </article>
        </on>

        <on condition="{{status === 'empty'}}">
          <article class="branch neutral">
            <strong>Aun no hay contenido</strong>
            <span>El componente puede representar un estado vacio sin codigo extra.</span>
          </article>
        </on>

        <on condition="{{status === 'error'}}">
          <article class="branch danger">
            <strong>Error de configuracion</strong>
            <span>Usa una rama cuando un estado necesita markup diferente.</span>
          </article>
        </on>

        <otherwise>
          <article class="branch idle">
            <strong>Elige una rama</strong>
            <span>Este fallback aparece porque ninguna condicion <code>&lt;on&gt;</code> coincide.</span>
          </article>
        </otherwise>
      </pick-select>
    </section>
  `,
})
class PickSelectExample extends PickComponent {
  @Reactive status: PanelStatus = "none";

  get statusLabel(): string {
    return STATUS_LABELS[this.status];
  }

  @Listen("#statusSelect", "change")
  changeStatus(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.status = this.toPanelStatus(value);
  }

  private toPanelStatus(value: string): PanelStatus {
    return value === "ready" || value === "empty" || value === "error"
      ? value
      : "none";
  }
}
