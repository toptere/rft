import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="header">
      <button class="menu" (click)="sidebarToggle.emit()" aria-label="Toggle user list">☰</button>
      <button class="menu" (click)="logoutToggle.emit()" aria-label="Sign user out">Logout</button>
      <div class="readouts">
        <div>
          <b>My location</b><span>{{ currentCoordinates }}</span
          ><small>{{ accuracyText }}</small>
        </div>
        <div>
          <b>Reticule</b><span>{{ centerCoordinates }}</span>
        </div>
      </div>
      <button class="layer" (click)="layerToggle.emit()">
        {{ satellite ? 'Road map' : 'Satellite' }}
      </button>
      <button
        class="locate"
        (click)="centerOnLocation.emit()"
        aria-label="Find my location"
        title="Find my location"
      >
        ⊙
      </button>
    </header>
  `,
  styles: [
    `
      .header {
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr) 64px;
        align-items: center;
        gap: 7px;
        padding: max(8px, env(safe-area-inset-top)) 8px 8px;
        background: #17212b;
        color: white;
      }

      .readouts {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 7px;
        min-width: 0;
      }

      .readouts div {
        display: grid;
        gap: 3px;
        min-width: 0;
      }

      .readouts span {
        overflow-wrap: anywhere;
        font-size: 10px;
        font-variant-numeric: tabular-nums;
      }

      .header button {
        min-width: 44px;
        min-height: 44px;
        padding: 6px;
        border-radius: 9px;
        touch-action: manipulation;
      }

      @media (min-width: 641px) {
        .header {
          display: flex;
          min-height: 66px;
          padding: 8px 12px;
        }

        .readouts {
          flex: 1;
          display: flex;
          justify-content: center;
          gap: 24px;
        }
      }
    `,
  ],
})
export class HeaderComponent {
  @Input() currentCoordinates = 'Waiting for GPS…';
  @Input() accuracyText = '';
  @Input() centerCoordinates = '—';
  @Input() satellite = false;
  @Output() sidebarToggle = new EventEmitter<void>();
  @Output() logoutToggle = new EventEmitter<void>();
  @Output() layerToggle = new EventEmitter<void>();
  @Output() centerOnLocation = new EventEmitter<void>();
}
