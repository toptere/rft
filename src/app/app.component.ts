import { Component, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from './services/auth.service';
import { LocationService } from './services/location.service';
import { LatLongLocation, LayerMode, OBS_EMAIL, UserWithLocation } from './models';
import { LoginComponent } from './login/login.component';
import { HeaderComponent } from './header/header.component';
import { OobSidebarComponent } from './oob-sidebar/oob-sidebar.component';
import { MapComponent } from './map/map.component';
import { SettingsSidebarComponent } from './settings-sidebar/settings-sidebar.component';
import {
  BROWSER_NO_GEOLOCATION,
  COULD_NOT_LOAD_USERS,
  LOCATION_UPLOAD_FAILED,
  UNABLE_OBTAIN_GPS_LOCATION,
  WAITING_PERMISSION,
} from '../resources/labels';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    LoginComponent,
    HeaderComponent,
    OobSidebarComponent,
    SettingsSidebarComponent,
    MapComponent,
  ],
  template: `
    @if (!isSignedIn()) {
      <app-login (loggedIn)="onLoggedIn()"></app-login>
    } @else {
      <main class="app-shell">
        <app-header
          [userLocation]="currentUserLocation()"
          [reticuleLocation]="currentReticuleLocation()"
          (oobSidebarToggle)="oobSidebarOpen = !oobSidebarOpen"
          (settingsSidebarToggle)="settingsSidebarOpen = !settingsSidebarOpen"
        >
        </app-header>
        <section class="map-area">
          <app-map
            [users]="users()"
            [currentUserId]="currentUserId()"
            [userLocation]="currentUserLocation()"
            [visibility]="visibility"
            [layerMode]="currentLayerMode"
            [centerOnLocation]="centerOnLocation"
            (centerChanged)="onCenterChanged($event)"
          ></app-map>
          <app-oob-sidebar
            [open]="oobSidebarOpen"
            [users]="users()"
            [visibility]="visibility"
            (close)="oobSidebarOpen = false"
            (visibilityChange)="setVisibility($event.userId, $event.visible)"
            (centerOnLocation)="onCenterOnLocation($event)"
          >
          </app-oob-sidebar>
          <app-settings-sidebar
            [isOpen]="settingsSidebarOpen"
            [userEmail]="currentUserEmail()"
            [userLocation]="currentUserLocation()"
            [layerMode]="currentLayerMode"
            (close)="settingsSidebarOpen = false"
            (toggleLayer)="onMapLayerChange($event)"
            (logout)="onLogout()"
          >
          </app-settings-sidebar>
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
  currentUserId: WritableSignal<string | null> = signal(null);
  currentUserEmail: WritableSignal<string | undefined> = signal(undefined);
  users: WritableSignal<UserWithLocation[]> = signal([]);
  visibility: Record<string, boolean> = {};

  gpsError = '';

  currentLayerMode: LayerMode = LayerMode.ROAD;
  oobSidebarOpen = false;
  settingsSidebarOpen = false;
  centerOnLocation: LatLongLocation | undefined = undefined;

  private watchId: number | null = null;
  private subs = new Subscription();
  private initializedForUserId: string | null = null;

  isSignedIn: WritableSignal<boolean> = signal(false);
  currentUserLocation: WritableSignal<LatLongLocation | undefined> = signal(undefined);
  currentReticuleLocation: WritableSignal<LatLongLocation | undefined> = signal(undefined);

  constructor(
    private auth: AuthService,
    private locations: LocationService,
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.locations.users$.subscribe((users: UserWithLocation[]) => {
        this.users.set(users);
        for (const user of users) {
          if (this.visibility[user.id] === undefined) this.visibility[user.id] = true;
        }
      }),
    );
    this.subs.add(
      this.auth.user$.subscribe((user) => {
        if (user) {
          this.currentUserId.set(user.id);
          this.currentUserEmail.set(user.email);
          this.isSignedIn.set(true);
          if (this.initializedForUserId !== user.id) {
            this.initializedForUserId = user.id;
            void this.initialize();
          }
        } else {
          this.isSignedIn.set(false);
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
      this.gpsError = e instanceof Error ? e.message : COULD_NOT_LOAD_USERS;
    }
  }

  private startTracking(): void {
    if (!navigator.geolocation) {
      this.gpsError = BROWSER_NO_GEOLOCATION;
      return;
    }
    if (this.watchId !== null) return;
    this.gpsError = WAITING_PERMISSION;
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const newLocation: LatLongLocation = { latitude, longitude, accuracy };
        this.currentUserLocation.set(newLocation);
        this.currentReticuleLocation.set({ latitude, longitude });
        this.gpsError = '';
        const currentUserIdVal: string | null = this.currentUserId();
        if (currentUserIdVal && this.currentUserEmail() !== OBS_EMAIL) {
          void this.locations
            .publishMyLocation(currentUserIdVal, latitude, longitude, accuracy)
            .catch(
              (e) => (this.gpsError = e instanceof Error ? e.message : LOCATION_UPLOAD_FAILED),
            );
        }
      },
      (error) => {
        this.gpsError = error.message || UNABLE_OBTAIN_GPS_LOCATION;
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
  }

  onCenterChanged(center: { lat: number; lng: number }): void {
    this.currentReticuleLocation.set({ latitude: center.lat, longitude: center.lng });
  }

  onMapLayerChange(layerMode: LayerMode): void {
    this.currentLayerMode = layerMode;
  }

  onLogout(): void {
    this.auth
      .signOut()
      .catch((reason) => console.error(reason))
      .finally(() => {
        this.currentUserId.set(null);
        this.currentUserEmail.set(undefined);
        this.currentUserLocation.set(undefined);
        this.currentReticuleLocation.set(undefined);
      });
  }

  setVisibility(id: string, visible: boolean): void {
    this.visibility = { ...this.visibility, [id]: visible };
  }

  onCenterOnLocation(latLongLocation: LatLongLocation): void {
    this.centerOnLocation = latLongLocation;
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
