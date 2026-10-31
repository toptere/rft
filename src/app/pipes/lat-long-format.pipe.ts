import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'latLongFormat',
})
export class LatLongFormatPipe implements PipeTransform {
  transform(latLongValue: number | undefined): string {
    return latLongValue?.toFixed(5) ?? '-';
  }
}
