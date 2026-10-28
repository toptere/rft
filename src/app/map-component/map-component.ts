import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import * as L from 'leaflet';

type MapMode = 'road' | 'satellite';
@Component({
  standalone: true,
  imports: [],
  selector: 'app-map-component',
  styleUrl: './map-component.css',
  templateUrl: './map-component.html',
})
export class MapComponent implements AfterViewInit, OnDestroy {
  mode: MapMode = 'road';
  status = 'Requesting location…';

  private map?: L.Map;
  private marker?: L.CircleMarker;
  private accuracyCircle?: L.Circle;
  private roadLayer?: L.TileLayer;
  private satelliteLayer?: L.TileLayer;

  ngAfterViewInit(): void {
    this.map = L.map('map', {
      zoomControl: false,
    }).setView([46.6, 2.4], 6);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    this.roadLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });

    this.satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Imagery &copy; Esri and its imagery providers',
      },
    );

    this.roadLayer.addTo(this.map);
    this.locateMe();
  }

  setMode(mode: MapMode): void {
    if (!this.map) return;

    this.mode = mode;

    this.roadLayer?.remove();
    this.satelliteLayer?.remove();

    if (mode === 'road') {
      this.roadLayer?.addTo(this.map);
    } else {
      this.satelliteLayer?.addTo(this.map);
    }
  }

  locateMe(): void {
    if (!navigator.geolocation) {
      this.status = 'Geolocation is not supported';
      return;
    }

    this.status = 'Finding your location…';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!this.map) return;

        const { latitude, longitude, accuracy } = position.coords;

        const location = L.latLng(latitude, longitude);

        this.map.setView(location, 16);

        if (this.marker) {
          this.marker.setLatLng(location);
        } else {
          this.marker = L.circleMarker(location, {
            radius: 8,
            color: '#ffffff',
            weight: 3,
            fillColor: '#1677ff',
            fillOpacity: 1,
          }).addTo(this.map);
        }

        if (this.accuracyCircle) {
          this.accuracyCircle.setLatLng(location).setRadius(accuracy);
        } else {
          this.accuracyCircle = L.circle(location, {
            radius: accuracy,
            color: '#1677ff',
            fillColor: '#1677ff',
            fillOpacity: 0.12,
            weight: 1,
          }).addTo(this.map);
        }

        this.status = `Location accuracy: ${Math.round(accuracy)} m`;
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.status = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            this.status = 'Location unavailable';
            break;
          default:
            this.status = 'Location request timed out';
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
