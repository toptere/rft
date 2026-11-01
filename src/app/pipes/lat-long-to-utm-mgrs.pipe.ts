import { Pipe, PipeTransform } from '@angular/core';
import { LatLongLocation } from '../models';
import * as mgrs from 'mgrs';

const UTM_MGRS_FORMAT_MATCHER = /^(\d{1,2}[C-HJ-NP-X])([A-HJ-NP-Z]{2})(\d{5})(\d{5})$/;

@Pipe({
  name: 'latLongToUtmMgrs',
})
export class LatLongToUtmMgrsPipe implements PipeTransform {
  transform(location: LatLongLocation | undefined): string {
    if (!location) {
      return '-';
    }
    const latitude: number = location.latitude;
    const longitude: number = location.longitude;
    if (latitude < -80 || latitude > 84 || longitude < -180 || longitude > 180) {
      return '-';
    }

    // Convert coordinates to MGRS
    const rawMgrsCoords: string = mgrs.forward([longitude, latitude], 5);

    // MGRS format: GRID_ZONE + 100km square + easting + northing
    const match: RegExpMatchArray | null = rawMgrsCoords.match(UTM_MGRS_FORMAT_MATCHER);
    if (!match) {
      return '-';
    }
    const [, gridZone, square, easting, northing] = match;
    return `${gridZone} ${square} ${easting} ${northing}`;
  }
}
