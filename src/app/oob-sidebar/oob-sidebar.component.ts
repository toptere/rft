import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { LatLongLocation, UserLocation, UserWithLocation, UnitWithUsers } from '../models';
import { LatLongToUtmMgrsPipe } from '../pipes/lat-long-to-utm-mgrs.pipe';
import { ACCURACY, COLLAPSE, NO_LOCATION_RECEIVED, OOB_TITLE, SHOW } from '../../resources/labels';

const UNIT_VISIBILITY_STORAGE_KEY: string = 'unit-marker-visibility';
const USER_VISIBILITY_STORAGE_KEY: string = 'user-marker-visibility';

@Component({
  selector: 'app-oob-sidebar',
  standalone: true,
  imports: [DatePipe, DecimalPipe, LatLongToUtmMgrsPipe],
  template: `
    <aside class="sidebar" [class.open]="open">
      <div class="title">
        <h2>{{ OOB_TITLE }}</h2>
      </div>
      @for (unit of units; track unit) {
        <div class="unit">
          <section class="unit-header">
            <button class="unit-header-button" (click)="toggleUnitVisibility(unit.unitName)">
              {{ unitVisibility[unit.unitName] ? SHOW : COLLAPSE }} {{ unit.unitName }}
            </button>
          </section>
          <div class="unit-content" [hidden]="unitVisibility[unit.unitName]">
            @for (user of unit.unitUsers; track user.id) {
              <article class="user">
                <input
                  type="checkbox"
                  [checked]="markerVisibility[user.id] ?? true"
                  (change)="toggleMarkerVisibility(user.id, $any($event.target).checked)"
                />
                <div class="user-info">
                  <label class="name">
                    <b>{{ user.username }}</b>
                  </label>
                  @if (user.location; as loc) {
                    <div>
                      {{ { latitude: loc.latitude, longitude: loc.longitude } | latLongToUtmMgrs }}
                    </div>
                    <small>{{ ACCURACY }}: {{ loc.accuracy_m | number: '1.0-0' }} m</small>
                    <small
                      >{{ loc.updated_at | date: 'ddHHmm' }}L
                      {{ loc.updated_at | date: 'LLL yy' }}</small
                    >
                  } @else {
                    <small>{{ NO_LOCATION_RECEIVED }}</small>
                  }
                </div>
                <button
                  (click)="centerOnUserLocation(user.location)"
                  [disabled]="!user.location"
                  aria-label="Center on user location"
                >
                  ◎
                </button>
              </article>
            }
          </div>
        </div>
      }
    </aside>
  `,
  styles: [
    `
      .sidebar {
        position: absolute;
        z-index: 2000;
        top: 0;
        bottom: 0;
        left: 0;
        width: min(340px, 88vw);
        overflow: auto;
        background: #fff;
        box-shadow: 4px 0 18px #0002;
        transform: translateX(-105%);
        transition: transform 0.2s ease;
        font:
          13px Arial,
          sans-serif;
      }

      .sidebar.open {
        transform: translateX(0);
      }

      .title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid #ddd;
      }

      h2 {
        margin: 0;
        font-size: 18px;
      }

      button {
        border: 0;
        background: transparent;
        font-size: 24px;
        cursor: pointer;
      }

      .unit {
        border-top: 3px solid #c1c1c1;

        .unit-header {
          display: flex;
          justify-content: center;
          background: #f8e8e8;

          .unit-header-button {
            width: 100%;
            min-height: 48px;
            padding: 10px;
            font-size: 16px;
            font-weight: 600;
          }
        }
      }

      .user {
        padding: 13px 16px;
        display: flex;
        gap: 5px;
        border-bottom: 1px solid #e4e7eb;
        overflow-wrap: anywhere;
        justify-content: space-between;
        align-items: center;
      }

      .user-info {
        display: grid;
        overflow-wrap: anywhere;
      }

      .name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
      }

      .user input {
        width: 20px;
        height: 20px;
        flex: 0 0 20px;
      }

      .user button {
        width: 20px;
        height: 20px;
        flex: 0 0 20px;
      }

      small {
        color: #58616e;
      }
    `,
  ],
})
export class OobSidebarComponent implements OnInit, OnChanges {
  @Input() open = false;
  @Input() users: UserWithLocation[] = [];
  @Input() visibility: Record<string, boolean> = {};
  @Output() close = new EventEmitter<void>();
  @Output() visibilityChange = new EventEmitter<{ userId: string; visible: boolean }>();
  @Output() centerOnLocation = new EventEmitter<LatLongLocation>();

  protected units: UnitWithUsers[] = [];
  protected markerVisibility: Record<string, boolean> = {};
  protected unitVisibility: Record<string, boolean> = {};

  ngOnInit(): void {
    this.loadUnitVisibility();
    this.loadMarkerVisibility();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['users']) {
      this.units = this.users
        .map((user) => user.unit)
        .filter(this.uniqueFilter)
        .map((unit: string): UnitWithUsers => {
          return { unitName: unit, isHidden: false, unitUsers: [] };
        })
        .sort((unit1: UnitWithUsers, unit2: UnitWithUsers): number =>
          unit1.unitName.localeCompare(unit2.unitName),
        );
      for (const user of this.users) {
        this.units
          .filter((unit) => unit.unitName === user.unit)
          .forEach((unit) => unit.unitUsers.push(user));
      }
    }
  }

  protected toggleUnitVisibility(unitName: string) {
    this.unitVisibility[unitName] = !this.unitVisibility[unitName];
    localStorage.setItem(UNIT_VISIBILITY_STORAGE_KEY, JSON.stringify(this.unitVisibility));
  }

  toggleMarkerVisibility(userId: string, visible: boolean): void {
    this.markerVisibility[userId] = visible;
    localStorage.setItem(USER_VISIBILITY_STORAGE_KEY, JSON.stringify(this.markerVisibility));
    this.visibilityChange.emit({
      userId,
      visible,
    });
  }

  protected centerOnUserLocation(location: UserLocation | null): void {
    if (location) {
      this.centerOnLocation.emit({ latitude: location.latitude, longitude: location.longitude });
      this.close.emit();
    }
  }

  private loadMarkerVisibility(): void {
    try {
      const saved: string | null = localStorage.getItem(USER_VISIBILITY_STORAGE_KEY);
      this.markerVisibility = saved ? JSON.parse(saved) : {};
    } catch {
      this.markerVisibility = {};
    }
    for (const userId in this.markerVisibility) {
      this.visibilityChange.emit({ userId, visible: this.markerVisibility[userId] });
    }
  }

  private loadUnitVisibility(): void {
    try {
      const saved: string | null = localStorage.getItem(UNIT_VISIBILITY_STORAGE_KEY);
      this.unitVisibility = saved ? JSON.parse(saved) : {};
    } catch {
      this.unitVisibility = {};
    }
  }

  private uniqueFilter(value: string, index: number, self: string[]) {
    return self.indexOf(value) === index;
  }

  protected readonly OOB_TITLE = OOB_TITLE;
  protected readonly SHOW = SHOW;
  protected readonly COLLAPSE = COLLAPSE;
  protected readonly NO_LOCATION_RECEIVED = NO_LOCATION_RECEIVED;
  protected readonly ACCURACY = ACCURACY;
}
