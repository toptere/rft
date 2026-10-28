import { Component, signal } from '@angular/core';
import { MapComponent } from './map-component/map-component';

@Component({
  imports: [MapComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('rft');
}
