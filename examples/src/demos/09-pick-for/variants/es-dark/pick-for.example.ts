import { PickComponent, PickRender, Reactive } from "pick-components";

interface Task {
  id: number;
  label: string;
  status: "pendiente" | "hecho";
}

@PickRender({
  selector: "pick-for-example",
  template: `
    <h3>Pick For</h3>
    <p>
      <code>&lt;pick-for&gt;</code> repite sus hijos por cada item.
      Dentro del bloque tienes <code>{{$item}}</code> y <code>{{$index}}</code>.
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
    { id: 1, label: "Definir el componente", status: "hecho" },
    { id: 2, label: "Renderizar cada tarea", status: "hecho" },
    { id: 3, label: "Mantener DOM estable con key", status: "pendiente" },
  ];
}
