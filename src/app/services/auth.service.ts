import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase.client';

const EMAIL_DOMAIN = '@rft.neb';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session$ = new BehaviorSubject<Session | null>(null);
  readonly user$ = new BehaviorSubject<User | null>(null);
  readonly ready$ = new BehaviorSubject<boolean>(false);

  constructor() {
    supabase.auth.getSession().then(({ data }) => {
      this.session$.next(data.session);
      this.user$.next(data.session?.user ?? null);
      this.ready$.next(true);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      this.session$.next(session);
      this.user$.next(session?.user ?? null);
      this.ready$.next(true);
    });
  }

  async signIn(username: string, password: string): Promise<void> {
    const normalized = username.trim().toLowerCase();
    if (!/^[a-z0-9]+$/.test(normalized)) {
      throw new Error('Enter a valid username.');
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: `${normalized}${EMAIL_DOMAIN}`,
      password
    });
    if (error) throw error;
  }

  // TODO - Magos - $date("Y-MM-d, H:m")$ -
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}
