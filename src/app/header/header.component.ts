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
        position: relative;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 66px;
        padding: 8px 12px;
        background: #17212b;
        color: #fff;
        font:
          13px Arial,
          sans-serif;
      }
      button {
        color: inherit;
        background: #263746;
        border: 1px solid #526372;
        border-radius: 7px;
        padding: 10px;
        cursor: pointer;
        white-space: nowrap;
      }
      .readouts {
        flex: 1;
        display: flex;
        justify-content: center;
        gap: clamp(10px, 3vw, 36px);
        min-width: 0;
      }
      .readouts div {
        display: grid;
        gap: 3px;
        min-width: 0;
      }
      span,
      small {
        color: #d1dbe4;
        overflow-wrap: anywhere;
      }
      b {
        font-size: 12px;
      }
      small {
        font-size: 11px;
      }
      @media (max-width: 600px) {
        .header {
          gap: 6px;
          padding: 7px;
        }
        .readouts {
          gap: 8px;
          font-size: 10px;
        }
        .readouts div {
          max-width: 42%;
        }
        button {
          padding: 8px;
          font-size: 11px;
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
