import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LatLongToUtmMgrsPipe } from '../pipes/lat-long-to-utm-mgrs.pipe';
import { LatLongLocation } from '../models';
import { METER_UNIT, MIL_UNIT, OOB_BUTTON } from '../../resources/labels';

const TO_RADIANS = (degrees: number) => (degrees * Math.PI) / 180;
const EARTH_RADIUS = 6371000;

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [LatLongToUtmMgrsPipe],
  template: `
    <header class="header">
      <button
        class="sidebar-toggle"
        (click)="oobSidebarToggle.emit()"
        aria-label="Toggle user list"
      >
        {{ OOB_BUTTON }}
      </button>
      <div class="reticule">
        <span class="coordinates">
          {{ reticuleLocation | latLongToUtmMgrs }}
        </span>
        -
        <span class="info"> {{ distanceToReticule }} {{ millsToReticule }} </span>
      </div>
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

      .reticule {
        white-space: wrap;
        .coordinates {
          font-weight: 600;
        }
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
  @Input() userLocation: LatLongLocation | undefined = undefined;
  @Input() reticuleLocation: LatLongLocation | undefined = undefined;

  @Output() oobSidebarToggle = new EventEmitter<void>();
  @Output() settingsSidebarToggle = new EventEmitter<void>();

  get distanceToReticule(): string {
    if (this.userLocation && this.reticuleLocation) {
      const lat1 = TO_RADIANS(this.userLocation.latitude);
      const lat2 = TO_RADIANS(this.reticuleLocation.latitude);
      const deltaLat = TO_RADIANS(this.reticuleLocation.latitude - this.userLocation.latitude);
      const deltaLng = TO_RADIANS(this.reticuleLocation.longitude - this.userLocation.longitude);

      const a =
        Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

      const distance: number = Math.round(
        EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
      );
      return distance + METER_UNIT;
    } else {
      return '-';
    }
  }

  get millsToReticule(): string {
    if (this.userLocation && this.reticuleLocation) {
      // Identical coordinates have no defined bearing.
      if (
        this.userLocation.latitude === this.reticuleLocation.latitude &&
        this.userLocation.longitude === this.reticuleLocation.longitude
      ) {
        return '-';
      }
      const lat1: number = TO_RADIANS(this.userLocation.latitude);
      const lat2: number = TO_RADIANS(this.reticuleLocation.latitude);
      const deltaLongitude: number = TO_RADIANS(
        this.reticuleLocation.longitude - this.userLocation.longitude,
      );

      // Calculate initial bearing.
      const y: number = Math.sin(deltaLongitude) * Math.cos(lat2);
      const x: number =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLongitude);

      const bearing: number = Math.atan2(y, x);

      // Normalize bearing to 0–360 degrees.
      const degrees: number = ((bearing * 180) / Math.PI + 360) % 360;
      // Convert degrees to NATO mils (6400 mils per circle).
      const mils: number = Math.round(degrees * (6400 / 360)) % 6400;

      return `${mils}` + MIL_UNIT;
    } else {
      return '-';
    }
  }

  protected readonly OOB_BUTTON = OOB_BUTTON;
}
