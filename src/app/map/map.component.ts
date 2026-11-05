import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { LatLongLocation, LayerMode, UserLocation, UserWithLocation } from '../models';

@Component({
  selector: 'app-map',
  standalone: true,
  template: ` <div #mapHost class="map">
      <button
        class="center-map-button"
        (click)="centerOnCurrentUser()"
        aria-label="Center map on my location"
        title="Center map on my location"
      >
        ◎
      </button>
    </div>
    <div class="reticule" aria-hidden="true"><span></span><i></i></div>`,
  styles: [
    `
      :host {
        display: block;
        position: relative;
        flex: 1;
        min-height: 0;
      }

      :host ::ng-deep .leaflet-control-zoom a {
        width: 36px;
        height: 36px;
        line-height: 34px;
        font-size: 22px;
      }

      :host ::ng-deep .leaflet-control-attribution {
        font-size: 9px;
      }

      .map {
        inset: 0;
        position: relative;
        width: 100%;
        height: 100%;
      }

      .reticule {
        pointer-events: none;
        position: absolute;
        z-index: 700;
        left: 50%;
        top: 50%;
        width: 28px;
        height: 28px;
        transform: translate(-50%, -50%);
      }

      .reticule span,
      .reticule i {
        position: absolute;
        display: block;
        background: #111;
        box-shadow: 0 0 2px white;
      }

      .reticule span {
        width: 28px;
        height: 2px;
        left: 0;
        top: 13px;
      }

      .reticule i {
        width: 2px;
        height: 28px;
        left: 13px;
        top: 0;
      }

      .center-map-button {
        position: absolute;
        z-index: 1000;
        right: 12px;
        bottom: 35px;
        width: 48px;
        height: 48px;
        border: 0;
        border-radius: 50%;
        background: white;
        color: #222;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        font-size: 28px;
        cursor: pointer;
        touch-action: manipulation;
      }

      .center-map-button:active {
        background: #eee;
      }
    `,
  ],
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapHost', { static: true }) mapHost!: ElementRef<HTMLDivElement>;
  @Input() users: UserWithLocation[] = [];
  @Input() currentUserId: string | null = null;
  @Input() userLocation: LatLongLocation | undefined = undefined;
  @Input() visibility: Record<string, boolean> = {};
  @Input() layerMode: LayerMode = LayerMode.ROAD;
  @Input() centerOnLocation: LatLongLocation | undefined = undefined;
  @Output() centerChanged = new EventEmitter<{ lat: number; lng: number }>();

  private map?: L.Map;
  private road?: L.TileLayer;
  private imagery?: L.TileLayer;
  private markers = new Map<string, L.Marker>();
  private didInitialCenter = false;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapHost.nativeElement, { zoomControl: true }).setView([20, 0], 2);
    this.road = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    });
    this.imagery = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
      },
    );
    (this.layerMode === LayerMode.SATELLITE ? this.imagery : this.road).addTo(this.map);
    L.control
      .scale({
        position: 'bottomleft',
        metric: true,
        imperial: false,
        maxWidth: 120,
      })
      .addTo(this.map);
    this.map.on('move', () => {
      const c = this.map!.getCenter();
      this.centerChanged.emit({ lat: c.lat, lng: c.lng });
    });
    this.syncMarkers();
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;
    if (changes['layerMode']) {
      this.road?.remove();
      this.imagery?.remove();
      (this.layerMode === LayerMode.SATELLITE ? this.imagery : this.road)?.addTo(this.map);
    }
    if (changes['centerOnLocation'] && this.centerOnLocation) {
      this.centerOn(this.centerOnLocation);
    }
    if (changes['users']) {
      this.syncMarkers();
    }
  }

  private syncMarkers(): void {
    if (!this.map) return;
    const nowMinusOneHour: Date = new Date();
    nowMinusOneHour.setHours(nowMinusOneHour.getHours() -1);
    for (const user of this.users) {
      const loc = user.location;
      if (!loc) {
        this.markers.get(user.id)?.remove();
        this.markers.delete(user.id);
        continue;
      }
      const markerClass: string = this.computeUserMarkerClass(loc, nowMinusOneHour);
      let marker = this.markers.get(user.id);
      if (!marker) {
        marker = L.marker([loc.latitude, loc.longitude], {
          icon: L.divIcon({
            className: 'user-marker-wrapper',
            html: `<div class="${markerClass}">${this.escapeHtml(user.username)}</div>`,
            iconSize: undefined,
            iconAnchor: [0, 15],
          }),
        });
        this.markers.set(user.id, marker);
      } else {
        marker.setLatLng([loc.latitude, loc.longitude]);
        marker.setIcon(
          L.divIcon({
            className: 'user-marker-wrapper',
            html: `<div class="${markerClass}">${this.escapeHtml(user.username)}</div>`,
            iconAnchor: [0, 15],
          }),
        );
      }
      if (this.visibility[user.id]) marker.addTo(this.map);
      else marker.remove();

      if (!this.didInitialCenter && loc && user.id === this.currentUserId) {
        this.map.setView([loc.latitude, loc.longitude], 14);
        this.didInitialCenter = true;
      }
    }
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
    );
  }

  private computeUserMarkerClass(location: UserLocation, referenceDate: Date): string {
    const updatedAt: Date = new Date(location.updated_at);
    return updatedAt < referenceDate ? 'user-marker old' : 'user-marker';
  }

  centerOnCurrentUser(): void {
    if (this.map && this.userLocation) {
      this.centerOn(this.userLocation);
    }
  }

  centerOn(location: LatLongLocation): void {
    this.map?.setView([location.latitude, location.longitude], Math.max(this.map.getZoom(), 14));
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
