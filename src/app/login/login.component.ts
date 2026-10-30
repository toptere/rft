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
        <label
          >Username
          <input
            name="username"
            [(ngModel)]="username"
            autocomplete="username"
            required
            autofocus
          />
        </label>
        <label
          >Password
          <input
            name="password"
            [(ngModel)]="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </label>
        @if (error) {
          <p class="error">{{ error }}</p>
        }
        <button type="submit" [disabled]="busy">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
      </form>
    </div>
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 5000;
        display: grid;
        place-items: center;
        padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
        background: #101820aa;
      }

      .dialog {
        width: min(100%, 380px);
        max-height: 100%;
        overflow: auto;
        display: grid;
        gap: 16px;
        padding: 24px;
        border-radius: 16px;
        background: white;
        box-shadow: 0 12px 48px #0004;
        font:
          16px/1.4 Arial,
          sans-serif;
      }

      .dialog input {
        width: 100%;
        min-height: 48px;
        padding: 12px;
        border: 1px solid #aab4bf;
        border-radius: 8px;
        font-size: 16px;
      }

      .dialog button {
        min-height: 48px;
        padding: 12px;
        border: 0;
        border-radius: 8px;
        background: #1769d2;
        color: white;
        font-weight: 700;
      }

      h1 {
        margin: 0 0 4px;
        font-size: 22px;
      }

      label {
        display: grid;
        gap: 6px;
        font-weight: 600;
      }

      button:disabled {
        opacity: 0.6;
      }

      .error {
        margin: 0;
        color: #b3241a;
      }
    `,
  ],
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
