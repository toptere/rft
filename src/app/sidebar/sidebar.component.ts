import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { UserWithLocation } from '../models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  template: `
    <aside class="sidebar" [class.open]="open">
      <div class="title">
        <h2>Users</h2>
        <button (click)="close.emit()" aria-label="Close user list">×</button>
      </div>
      @for (user of users; track user.id) {
        <article class="user">
          <label class="name"
            ><input
              type="checkbox"
              [checked]="visibility[user.id] !== false"
              (change)="
                visibilityChange.emit({ id: user.id, visible: $any($event.target).checked })
              "
            /><b>{{ user.username }}</b></label
          >
          @if (user.location; as loc) {
            <div>{{ loc.latitude | number: '1.5-5' }}, {{ loc.longitude | number: '1.5-5' }}</div>
            <small>Accuracy: {{ loc.accuracy_m | number: '1.0-0' }} m</small>
            <small>{{ loc.updated_at | date: 'medium' }}</small>
          } @else {
            <small>No location received yet</small>
          }
        </article>
      }
    </aside>
    @if (open) {
      <button class="scrim" aria-label="Close user list" (click)="close.emit()"></button>
    }
  `,
  styles: [
    `
      .sidebar {
        position: absolute;
        z-index: 2000;
        top: 0;
        bottom: 0;
        left: 0;
        width: min(340px, 88vw);
        overflow: auto;
        background: #fff;
        box-shadow: 4px 0 18px #0002;
        transform: translateX(-105%);
        transition: transform 0.2s ease;
        font:
          13px Arial,
          sans-serif;
      }

      .sidebar.open {
        transform: translateX(0);
      }

      .title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid #ddd;
      }

      h2 {
        margin: 0;
        font-size: 18px;
      }

      button {
        border: 0;
        background: transparent;
        font-size: 24px;
        cursor: pointer;
      }

      .user {
        padding: 13px 16px;
        display: grid;
        gap: 5px;
        border-bottom: 1px solid #e4e7eb;
        overflow-wrap: anywhere;
      }

      .name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
      }

      .name input {
        width: 20px;
        height: 20px;
        flex: 0 0 20px;
      }

      small {
        color: #58616e;
      }

      .scrim {
        position: absolute;
        z-index: 1500;
        inset: 0;
        width: 100%;
        border: 0;
        background: #0002;
      }
    `,
  ],
})
export class SidebarComponent {
  @Input() open = false;
  @Input() users: UserWithLocation[] = [];
  @Input() visibility: Record<string, boolean> = {};
  @Output() close = new EventEmitter<void>();
  @Output() visibilityChange = new EventEmitter<{ id: string; visible: boolean }>();
}
