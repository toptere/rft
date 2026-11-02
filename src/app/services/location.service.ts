import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LatLongLocation, OBS, UserLocation, UserWithLocation } from '../models';
import { supabase } from '../supabase.client';
import * as mgrs from 'mgrs';

const UTM_MGRS_FORMAT_MATCHER = /^(\d{1,2}[C-HJ-NP-X])([A-HJ-NP-Z]{2})(\d{5})(\d{5})$/;

@Injectable({ providedIn: 'root' })
export class LocationService {
  readonly users$ = new BehaviorSubject<UserWithLocation[]>([]);
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private lastWriteAt = 0;

  async loadUsers(): Promise<void> {
    const [{ data: profiles, error: profileError }, { data: locations, error: locationError }] =
      await Promise.all([
        supabase.from('profiles').select('id, username, hierarchy, unit').order('hierarchy'),
        supabase.from('locations').select('user_id, latitude, longitude, accuracy_m, updated_at'),
      ]);
    if (profileError) throw profileError;
    if (locationError) throw locationError;

    const locationById = new Map(
      (locations ?? []).map((loc) => [loc.user_id, loc as UserLocation]),
    );
    this.users$.next(
      (profiles ?? [])
        .map((profile): UserWithLocation => ({
          id: profile.id,
          username: profile.username,
          location: locationById.get(profile.id) ?? null,
          unit: profile.unit,
          hierarchy: profile.hierarchy,
        }))
        .filter((profile: UserWithLocation) => profile.username !== OBS)
        .sort((u1: UserWithLocation, u2: UserWithLocation) =>
          u1.hierarchy.localeCompare(u2.hierarchy),
        ),
    );
  }

  async publishMyLocation(
    userId: string,
    latitude: number,
    longitude: number,
    accuracy: number,
  ): Promise<void> {
    // Avoid flooding the database when the browser emits very frequent GPS updates.
    const now = Date.now();
    if (now - this.lastWriteAt < 5000) return;
    this.lastWriteAt = now;
    const { error } = await supabase.from('locations').upsert(
      {
        user_id: userId,
        latitude,
        longitude,
        accuracy_m: Math.max(0, accuracy),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) {
      this.lastWriteAt = 0;
      throw error;
    }
  }

  startRealtime(): void {
    if (this.channel) return;
    this.channel = supabase
      .channel('live-user-locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
        void this.loadUsers().catch(console.error);
      })
      .subscribe();
  }

  stopRealtime(): void {
    if (this.channel) void supabase.removeChannel(this.channel);
    this.channel = null;
  }

  computeDistanceBetweenLocations(loc1: LatLongLocation, loc2: LatLongLocation): number {
    const latitude1: number = loc1.latitude;
    const longitude1: number = loc1.longitude;
    if (latitude1 < -80 || latitude1 > 84 || longitude1 < -180 || longitude1 > 180) {
      return 0;
    }
    const latitude2: number = loc2.latitude;
    const longitude2: number = loc2.longitude;
    if (latitude2 < -80 || latitude2 > 84 || longitude2 < -180 || longitude2 > 180) {
      return 0;
    }

    // Convert coordinates to MGRS
    const rawMgrsCoords1: string = mgrs.forward([longitude1, latitude1], 5);
    const rawMgrsCoords2: string = mgrs.forward([longitude2, latitude2], 5);

    // MGRS format: GRID_ZONE + 100km square + easting + northing
    const match1: RegExpMatchArray | null = rawMgrsCoords1.match(UTM_MGRS_FORMAT_MATCHER);
    const match2: RegExpMatchArray | null = rawMgrsCoords2.match(UTM_MGRS_FORMAT_MATCHER);
    if (!match1 || !match2) {
      return 0;
    }
    const [, easting1, northing1] = match1;
    const [, easting2, northing2] = match2;
    const locVal1: number = Number(easting1) + Number(northing1);
    const locVal2: number = Number(easting2) + Number(northing2);
    return Math.abs(locVal1 - locVal2);
  }
}
