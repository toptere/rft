import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LatLongFormatPipe } from '../pipes/lat-long-format.pipe';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [LatLongFormatPipe],
  template: `
    <header class="header">
      <button
        class="sidebar-toggle"
        (click)="oobSidebarToggle.emit()"
        aria-label="Toggle user list"
      >
        OB
      </button>
      <span class="reticule-distance">
        {{ reticuleLatitude | latLongFormat }}
      </span>
      <span class="reticule-distance">
        {{ reticuleLongitude | latLongFormat }}
      </span>
      <span class="reticule-distance">
        {{ distanceToReticule ? distanceToReticule + ' m' : '—' }}
      </span>
      <button
        class="sidebar-toggle"
        (click)="settingsSidebarToggle.emit()"
        aria-label="Open user menu"
      >
        ☰
      </button>
    </header>
  `,
  styles: [
    `
      .header {
        display: flex;
        justify-content: space-between;
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

      .reticule-distance {
        white-space: nowrap;
        font-weight: 600;
      }

      .sidebar-toggle {
        min-width: 44px;
        min-height: 44px;
        font-size: 22px;
        flex-shrink: 0;
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
  @Input() userLatitude: number | undefined = undefined;
  @Input() userLongitude: number | undefined = undefined;
  @Input() reticuleLatitude: number | undefined = undefined;
  @Input() reticuleLongitude: number | undefined = undefined;

  @Output() oobSidebarToggle = new EventEmitter<void>();
  @Output() settingsSidebarToggle = new EventEmitter<void>();

  get distanceToReticule(): number | undefined {
    if (
      this.userLatitude &&
      this.userLongitude &&
      this.reticuleLatitude &&
      this.reticuleLongitude
    ) {
      const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
      const earthRadius = 6371000;

      const lat1 = toRadians(this.userLatitude);
      const lat2 = toRadians(this.reticuleLatitude);
      const deltaLat = toRadians(this.reticuleLatitude - this.userLatitude);
      const deltaLng = toRadians(this.reticuleLongitude - this.userLongitude);

      const a =
        Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

      return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    } else {
      return;
    }
  }
}
