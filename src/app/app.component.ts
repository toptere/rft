import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from './services/auth.service';
import { LocationService } from './services/location.service';
import { UserWithLocation } from './models';
import { LoginComponent } from './login/login.component';
import { HeaderComponent } from './header/header.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { MapComponent } from './map/map.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LoginComponent, HeaderComponent, SidebarComponent, MapComponent],
  template: `
    @if (!signedIn) {
      <app-login (loggedIn)="onLoggedIn()"></app-login>
    } @else {
      <main class="app-shell">
        <app-header
          [currentCoordinates]="currentCoordinates"
          [accuracyText]="accuracyText"
          [centerCoordinates]="centerCoordinates"
          [satellite]="satellite"
          (sidebarToggle)="sidebarOpen = !sidebarOpen"
          (logoutToggle)="onLogout()"
          (layerToggle)="satellite = !satellite"
          (centerOnLocation)="centerOnLocation = !centerOnLocation"
        >
        </app-header>
        <section class="map-area">
          <app-map
            [users]="users"
            [currentUserId]="currentUserId"
            [visibility]="visibility"
            [satellite]="satellite"
            [centerOnLocation]="centerOnLocation"
            (centerChanged)="onCenterChanged($event)"
          ></app-map>
          <app-sidebar
            [open]="sidebarOpen"
            [users]="users"
            [visibility]="visibility"
            (close)="sidebarOpen = false"
            (visibilityChange)="setVisibility($event.id, $event.visible)"
          >
          </app-sidebar>
        </section>
        @if (gpsError) {
          <div class="gps-error">{{ gpsError }}</div>
        }
      </main>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .app-shell {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      .map-area {
        position: relative;
        display: flex;
        flex: 1;
        min-height: 0;
      }
      .gps-error {
        position: absolute;
        z-index: 1200;
        left: 10px;
        bottom: 10px;
        max-width: 90%;
        padding: 8px 10px;
        background: #fff;
        border: 1px solid #b42318;
        color: #b42318;
        border-radius: 6px;
        font:
          12px Arial,
          sans-serif;
      }
    `,
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  signedIn = false;
  satellite = false;
  sidebarOpen = false;
  centerOnLocation = false;
  users: UserWithLocation[] = [];
  visibility: Record<string, boolean> = {};
  currentCoordinates = 'Waiting for GPS…';
  accuracyText = '';
  centerCoordinates = '—';
  gpsError = '';
  private watchId: number | null = null;
  private subs = new Subscription();
  currentUserId: string | null = null;
  private initializedForUserId: string | null = null;

  constructor(
    private auth: AuthService,
    private locations: LocationService,
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.locations.users$.subscribe((users) => {
        this.users = users;
        for (const user of users) {
          if (this.visibility[user.id] === undefined) this.visibility[user.id] = true;
        }
      }),
    );
    this.subs.add(
      this.auth.user$.subscribe((user) => {
        if (user) {
          this.currentUserId = user.id;
          this.signedIn = true;
          if (this.initializedForUserId !== user.id) {
            this.initializedForUserId = user.id;
            void this.initialize();
          }
        } else {
          this.signedIn = false;
          this.stopTracking();
          this.locations.stopRealtime();
          this.initializedForUserId = null;
        }
      }),
    );
  }

  async onLoggedIn(): Promise<void> {
    // Auth state subscription drives initialization.
  }

  private async initialize(): Promise<void> {
    try {
      await this.locations.loadUsers();
      this.locations.startRealtime();
      this.startTracking();
    } catch (e) {
      this.gpsError = e instanceof Error ? e.message : 'Could not load users.';
    }
  }

  private startTracking(): void {
    if (!navigator.geolocation) {
      this.gpsError = 'This browser does not support geolocation.';
      return;
    }
    if (this.watchId !== null) return;
    this.gpsError = 'Waiting for location permission…';
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        this.currentCoordinates = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        this.accuracyText = `Accuracy ±${Math.round(accuracy)} m`;
        this.gpsError = '';
        if (this.currentUserId) {
          void this.locations
            .publishMyLocation(this.currentUserId, latitude, longitude, accuracy)
            .catch(
              (e) => (this.gpsError = e instanceof Error ? e.message : 'Location upload failed.'),
            );
        }
      },
      (error) => {
        this.gpsError = error.message || 'Unable to obtain GPS location.';
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
  }

  onCenterChanged(center: { lat: number; lng: number }): void {
    this.centerCoordinates = `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`;
  }

  onLogout(): void {
    this.auth.signOut().catch((reason) => console.error(reason));
  }

  setVisibility(id: string, visible: boolean): void {
    this.visibility = { ...this.visibility, [id]: visible };
  }

  private stopTracking(): void {
    if (this.watchId !== null) navigator.geolocation?.clearWatch(this.watchId);
    this.watchId = null;
  }

  ngOnDestroy(): void {
    this.stopTracking();
    this.locations.stopRealtime();
    this.subs.unsubscribe();
  }
}
