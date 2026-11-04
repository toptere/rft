import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase.client';
import { ENTER_VALID_USERNAME } from '../../resources/labels';

const EMAIL_DOMAIN = '@rft.neb';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session$ = new BehaviorSubject<Session | null>(null);
  readonly user$ = new BehaviorSubject<User | null>(null);
  readonly ready$ = new BehaviorSubject<boolean | null>(false);

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
      throw new Error(ENTER_VALID_USERNAME);
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: `${normalized}${EMAIL_DOMAIN}`,
      password
    });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const error: AuthError | null = await supabase.auth.signOut().then(({ error }) => {
      this.session$.next(null);
      this.user$.next(null);
      this.ready$.next(false);
      return error;
    });
    if (error) throw error;
  }
}
