import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { UserWithLocation } from '../models';

@Component({
  selector: 'app-map',
  standalone: true,
  template: `<div #mapHost class="map"></div>
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
        width: 44px;
        height: 44px;
        line-height: 42px;
        font-size: 24px;
      }
      :host ::ng-deep .leaflet-control-attribution {
        font-size: 9px;
      }
      .map {
        position: absolute;
        inset: 0;
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
    `,
  ],
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapHost', { static: true }) mapHost!: ElementRef<HTMLDivElement>;
  @Input() users: UserWithLocation[] = [];
  @Input() currentUserId: string | null = null;
  @Input() visibility: Record<string, boolean> = {};
  @Input() satellite = false;
  @Input() centerOnLocation = false;
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
    (this.satellite ? this.imagery : this.road).addTo(this.map);
    this.map.on('move', () => {
      const c = this.map!.getCenter();
      this.centerChanged.emit({ lat: c.lat, lng: c.lng });
    });
    this.syncMarkers();
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;
    if (changes['satellite']) {
      this.road?.remove();
      this.imagery?.remove();
      (this.satellite ? this.imagery : this.road)?.addTo(this.map);
    }
    if (changes['centerOnLocation']) {
      this.centerOnCurrentUser();
      console.log('Centered on user location');
    }
    this.syncMarkers();
  }

  private syncMarkers(): void {
    if (!this.map) return;
    for (const user of this.users) {
      const loc = user.location;
      if (!loc) {
        this.markers.get(user.id)?.remove();
        this.markers.delete(user.id);
        continue;
      }
      let marker = this.markers.get(user.id);
      if (!marker) {
        marker = L.marker([loc.latitude, loc.longitude], {
          icon: L.divIcon({
            className: 'user-marker-wrapper',
            html: `<div class="user-marker">${this.escapeHtml(user.username)}</div>`,
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
            html: `<div class="user-marker">${this.escapeHtml(user.username)}</div>`,
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

  centerOnCurrentUser(): void {
    if (!this.map) return;
    for (const user of this.users) {
      if (user.id === this.currentUserId) {
        const loc = user.location;
        if (loc) {
          this.map.setView([loc.latitude, loc.longitude], 14);
        }
        break;
      }
    }
  }

  centerOn(lat: number, lng: number): void {
    this.map?.setView([lat, lng], Math.max(this.map.getZoom(), 14));
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
