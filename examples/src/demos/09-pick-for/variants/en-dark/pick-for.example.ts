import { PickComponent, PickRender, Reactive } from "pick-components";

interface Task {
  id: number;
  label: string;
  status: "todo" | "done";
}

@PickRender({
  selector: "pick-for-example",
  template: `
    <h3>Pick For</h3>
    <p>
      <code>&lt;pick-for&gt;</code> repeats its children for each item.
      Inside the block you get <code>{{$item}}</code> and <code>{{$index}}</code>.
    </p>

    <pick-for items="{{tasks}}" key="id">
      <article>
        <strong>#{{$index}} {{$item.label}}</strong>
        <span>{{$item.status}}</span>
      </article>
    </pick-for>

    <p>Total: <strong>{{tasks.length}}</strong></p>
  `,
})
class PickForExample extends PickComponent {
  @Reactive tasks: Task[] = [
    { id: 1, label: "Define the component", status: "done" },
    { id: 2, label: "Render every task", status: "done" },
    { id: 3, label: "Keep stable DOM with key", status: "todo" },
  ];
}
