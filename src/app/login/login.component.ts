import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="backdrop">
      <form class="dialog" (ngSubmit)="submit()">
        <h1>RFT - login</h1>
        <label>Username
          <input name="username" [(ngModel)]="username" autocomplete="username" required autofocus>
        </label>
        <label>Password
          <input name="password" [(ngModel)]="password" type="password" autocomplete="current-password" required>
        </label>
        @if (error) { <p class="error">{{ error }}</p> }
        <button type="submit" [disabled]="busy">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
      </form>
    </div>
  `,
  styles: [`
    .backdrop { position:fixed; inset:0; z-index:5000; display:grid; place-items:center; background:#101820aa; }
    .dialog { width:min(92vw,360px); display:grid; gap:14px; padding:24px; border-radius:12px; background:white; box-shadow:0 12px 48px #0004; font:14px Arial,sans-serif; }
    h1 { margin:0 0 4px; font-size:22px; }
    label { display:grid; gap:6px; font-weight:600; }
    input { box-sizing:border-box; width:100%; padding:11px; border:1px solid #aab4bf; border-radius:6px; font:inherit; }
    button { padding:11px; border:0; border-radius:6px; background:#1769d2; color:white; font-weight:700; cursor:pointer; }
    button:disabled { opacity:.6; }
    .error { margin:0; color:#b42318; }
  `]
})
export class LoginComponent {
  @Output() loggedIn = new EventEmitter<void>();
  username = '';
  password = '';
  error = '';
  busy = false;

  constructor(private auth: AuthService) {}

  async submit(): Promise<void> {
    this.error = '';
    this.busy = true;
    try {
      await this.auth.signIn(this.username, this.password);
      this.loggedIn.emit();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Login failed.';
    } finally {
      this.busy = false;
    }
  }
}
