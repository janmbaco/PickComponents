import slotStyles from "./slots.styles.css";
import { PickComponent, PickRender, Reactive } from "pick-components";

@PickRender({
  selector: "slot-panel",
  styles: slotStyles,
  template: `
    <section class="panel" aria-label="Slot composition">
      <header class="panel__header">
        <slot name="header"></slot>
      </header>

      <div class="panel__body">
        <slot></slot>
      </div>

      <footer class="panel__footer">
        <slot name="actions"></slot>
      </footer>
    </section>
  `,
})
class SlotPanel extends PickComponent {}

@PickRender({
  selector: "slot-heading",
  styles: slotStyles,
  template: `
    <div class="heading">
      <span class="heading__eyebrow">{{eyebrow}}</span>
      <h2>{{title}}</h2>
    </div>
  `,
})
class SlotHeading extends PickComponent {
  @Reactive eyebrow = "";
  @Reactive title = "";
}

@PickRender({
  selector: "slot-message",
  styles: slotStyles,
  template: `<p class="message">{{text}}</p>`,
})
class SlotMessage extends PickComponent {
  @Reactive text = "";
}

@PickRender({
  selector: "slot-status",
  styles: slotStyles,
  template: `<span class="status">{{label}}</span>`,
})
class SlotStatus extends PickComponent {
  @Reactive label = "";
}
