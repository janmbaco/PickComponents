import { Pick } from "pick-components";
import type { InlineContext } from "pick-components";
import type { PlaygroundNavigationGroup } from "../../examples-catalog/services/example-catalog.service.js";

interface PlaygroundSidebarState {
  groups: PlaygroundNavigationGroup[];
}

@Pick("tab-nav", (ctx: InlineContext<PlaygroundSidebarState>) => {
  ctx.state({
    groups: [],
  });

  ctx.css(`
    :host {
      display: block;
      color: var(--pg-shell-sidebar-link, #e7edf7);
      background: transparent;
    }
    nav.sidebar-nav {
      display: block;
      padding: 0;
      background: transparent;
    }
    .cat-label {
      display: block;
      padding: 0.5rem 1rem 0.35rem;
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--pg-shell-sidebar-heading, #7c8799);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    nav.sidebar-nav ul {
      display: block;
      list-style: none;
      padding: 0;
      margin: 0 0 0.5rem;
    }
    nav.sidebar-nav li {
      display: block;
      margin: 0;
      padding: 0;
    }
    nav.sidebar-nav li a {
      display: block;
      padding: 0.4rem 1rem 0.4rem 1.1rem;
      margin: 0 0.5rem 0.1rem 0;
      font-size: 0.8rem;
      color: var(--pg-shell-sidebar-link, #e7edf7);
      text-decoration: none;
      border-left: 3px solid transparent;
      border-radius: 0 0.7rem 0.7rem 0;
      transition: background 0.12s, border-color 0.12s, color 0.12s;
      cursor: pointer;
    }
    nav.sidebar-nav li a:hover {
      background: var(--pg-shell-sidebar-hover-bg, #1a2331);
      color: var(--pg-shell-sidebar-active-color, #8ac6f5);
    }
    nav.sidebar-nav li pick-link.active a {
      border-left-color: var(--pg-shell-sidebar-active-border, #61afef);
      color: var(--pg-shell-sidebar-active-color, #8ac6f5);
      font-weight: 600;
      background: var(--pg-shell-sidebar-active-bg, rgba(97, 175, 239, 0.16));
    }
  `);

  ctx.html(`
    <nav class="sidebar-nav">
      <pick-for items="{{groups}}" key="id">
        <span class="cat-label">{{$item.label}}</span>
        <ul>
          <pick-for items="{{$item.items}}" key="id">
            <li><pick-link to="{{$item.to}}" exact="true">{{$item.label}}</pick-link></li>
          </pick-for>
        </ul>
      </pick-for>
    </nav>
  `);
})
export class PlaygroundSidebar {}
