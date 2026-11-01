export interface UserProfile {
  id: string;
  username: string;
}

export interface UserLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number;
  updated_at: string;
}

export interface UserWithLocation extends UserProfile {
  location: UserLocation | null;
}

export enum LayerMode {
  ROAD, SATELLITE
}

export interface LatLongLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}
