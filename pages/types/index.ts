export type ViewMode = 'landing' | 'map' | 'navigation' | 'history' | 'lost';
export type TransportMode = 'walking' | 'cycling' | 'driving';
export type Language = 'en' | 'lt';

export interface PinSegment {
  letter: string;
  lat: number;
  lng: number;
}

export interface SavedRoute {
  id: string;
  date: string;
  distance: number;
  duration: number;
  pace: string;
  calories: number;
  path: Array<{ lat: number; lng: number }>;
}

export interface RouteInfo {
  distance: number;
  duration: number;
  coordinates: Array<[number, number]>;
  color: string;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
}
