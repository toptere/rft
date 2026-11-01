import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LatLongLocation, LayerMode } from '../models';
import { EmailToUsernamePipe } from '../pipes/email-to-username.pipe';
import { LatLongToUtmMgrsPipe } from '../pipes/lat-long-to-utm-mgrs.pipe';

@Component({
  selector: 'app-settings-sidebar',
  standalone: true,
  imports: [CommonModule, EmailToUsernamePipe, LatLongToUtmMgrsPipe],
  template: `
    <div class="sidebar-backdrop" *ngIf="isOpen" (click)="close.emit()"></div>

    <aside class="settings-sidebar" [class.open]="isOpen">
      <div class="sidebar-header">
        <h2>{{ userEmail | emailToUsername }}</h2>
      </div>

      <div class="sections">
        <section class="location-info">
          <div class="info">
            <strong>Coordinates:</strong><br />
            {{ userLocation | latLongToUtmMgrs }}
          </div>
          <div class="info">
            <strong>Accuracy:</strong><br />
            {{ userLocation ? (userLocation.accuracy | number: '1.0-0') + ' m' : '—' }}
          </div>
        </section>

        <section class="sidebar-layer">
          <button class="layer-button" (click)="switchLayerAndClose()">
            Switch to {{ layerMode === LayerMode.ROAD ? 'satellite' : 'road' }} map
          </button>
        </section>
      </div>

      <div class="sidebar-footer">
        <button class="logout-button" (click)="logoutAndClose()">Log out</button>
      </div>
    </aside>
  `,
  styles: [
    `
      .sidebar-backdrop {
        position: relative;
        inset: 0;
        z-index: 1100;
        background: rgba(0, 0, 0, 0.35);
      }

      .settings-sidebar {
        position: absolute;
        z-index: 1101;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(85vw, 340px);
        padding: 20px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        background: white;
        box-shadow: -3px 0 12px rgba(0, 0, 0, 0.2);
        transform: translateX(100%);
        transition: transform 0.25s ease;
      }

      .settings-sidebar.open {
        transform: translateX(0);
      }

      .sidebar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .sections {
        display: flex;
        flex-direction: column;
        margin-top: 20px;

        .location-info {
          padding: 10px 0;
          line-height: 2;
          overflow-wrap: anywhere;

          .info {
            padding: 10px 0 10px 0;
          }
        }

        .sidebar-layer {
          padding: 20px 20px;
        }

        .layer-button {
          width: 100%;
          min-height: 48px;
          padding: 10px;
          font-size: 16px;
        }
      }

      .sidebar-footer {
        margin-top: auto;
        padding-bottom: env(safe-area-inset-bottom);
      }

      .logout-button {
        background: #c62828;
        width: 100%;
        min-height: 48px;
        padding: 10px;
        font-size: 16px;
        color: white;
        border: 0;
        border-radius: 5px;
      }
    `,
  ],
})
export class SettingsSidebarComponent {
  @Input() isOpen = false;
  @Input() userEmail: string | undefined = '';
  @Input() userLocation: LatLongLocation | undefined = undefined;
  @Input() layerMode: LayerMode | undefined = LayerMode.ROAD;

  @Output() close = new EventEmitter<void>();
  @Output() toggleLayer = new EventEmitter<LayerMode>();
  @Output() logout = new EventEmitter<void>();
  protected readonly LayerMode = LayerMode;

  protected switchLayerAndClose(): void {
    this.toggleLayer.emit(this.layerMode === LayerMode.ROAD ? LayerMode.SATELLITE : LayerMode.ROAD);
    this.close.emit();
  }

  protected logoutAndClose(): void {
    this.logout.emit();
    this.close.emit();
  }
}
