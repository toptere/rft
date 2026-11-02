import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OBS, UserLocation, UserWithLocation } from '../models';
import { supabase } from '../supabase.client';

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

  async publishMyLocation(userId: string, latitude: number, longitude: number, accuracy: number): Promise<void> {
    // Avoid flooding the database when the browser emits very frequent GPS updates.
    const now = Date.now();
    if (now - this.lastWriteAt < 5000) return;
    this.lastWriteAt = now;

    const { error } = await supabase.from('locations').upsert({
      user_id: userId,
      latitude,
      longitude,
      accuracy_m: Math.max(0, accuracy),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) {
      this.lastWriteAt = 0;
      throw error;
    }
  }

  startRealtime(): void {
    if (this.channel) return;
    this.channel = supabase.channel('live-user-locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
        void this.loadUsers().catch(console.error);
      })
      .subscribe();
  }

  stopRealtime(): void {
    if (this.channel) void supabase.removeChannel(this.channel);
    this.channel = null;
  }
}
