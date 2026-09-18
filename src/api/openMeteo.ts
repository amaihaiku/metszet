/**
 * OmniForecast - Open-Meteo REST API Client & Consensus Engine
 * Tailored for Hungary & Central European High-Resolution Modeling
 */

import type {
  GeoLocation,
  OpenMeteoGeocodingResponse,
  OpenMeteoMultiModelResponse,
} from '../types/weather';
import { SUPPORTED_MODELS } from '../types/weather';

export const FORECAST_API_URL = 'https://api.open-meteo.com/v1/forecast';
export const GEOCODING_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * Custom error class for Open-Meteo API issues
 */
export class WeatherApiError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'WeatherApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Default location: Budapest, Hungary
 */
export const DEFAULT_LOCATION: GeoLocation = {
  id: 3054643,
  name: 'Budapest',
  latitude: 47.4979,
  longitude: 19.0402,
  elevation: 105,
  country: 'Magyarország',
  countryCode: 'HU',
  admin1: 'Budapest',
  timezone: 'Europe/Budapest',
  population: 1752286,
};

/**
 * Curated preset Hungarian cities for instant selection
 */
export const POPULAR_LOCATIONS: GeoLocation[] = [
  DEFAULT_LOCATION,
  {
    id: 721472,
    name: 'Debrecen',
    latitude: 47.5333,
    longitude: 21.6333,
    elevation: 121,
    country: 'Magyarország',
    countryCode: 'HU',
    admin1: 'Hajdú-Bihar',
    timezone: 'Europe/Budapest',
    population: 204124,
  },
  {
    id: 715429,
    name: 'Szeged',
    latitude: 46.253,
    longitude: 20.1482,
    elevation: 82,
    country: 'Magyarország',
    countryCode: 'HU',
    admin1: 'Csongrád-Csanád',
    timezone: 'Europe/Budapest',
    population: 161837,
  },
  {
    id: 3052009,
    name: 'Győr',
    latitude: 47.6833,
    longitude: 17.6351,
    elevation: 108,
    country: 'Magyarország',
    countryCode: 'HU',
    admin1: 'Győr-Moson-Sopron',
    timezone: 'Europe/Budapest',
    population: 132038,
  },
  {
    id: 716587,
    name: 'Pécs',
    latitude: 46.0727,
    longitude: 18.2323,
    elevation: 153,
    country: 'Magyarország',
    countryCode: 'HU',
    admin1: 'Baranya',
    timezone: 'Europe/Budapest',
    population: 142873,
  },
  {
    id: 717596,
    name: 'Miskolc',
    latitude: 48.1035,
    longitude: 20.7784,
    elevation: 131,
    country: 'Magyarország',
    countryCode: 'HU',
    admin1: 'Borsod-Abaúj-Zemplén',
    timezone: 'Europe/Budapest',
    population: 154521,
  },
];

/**
 * Helper to execute fetch requests with automatic retry and exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries: number = 2,
  backoffMs: number = 600
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      // Retry on server overload or temporary gateway errors
      if (
        (response.status === 503 ||
          response.status === 502 ||
          response.status === 504 ||
          response.status === 429) &&
        attempt < retries
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, backoffMs * Math.pow(2, attempt))
        );
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (
        options?.signal?.aborted ||
        (error instanceof DOMException && error.name === 'AbortError')
      ) {
        throw error;
      }
      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, backoffMs * Math.pow(2, attempt))
        );
        continue;
      }
    }
  }
  throw lastError;
}

/**
 * Fetch raw multi-model forecast data from Open-Meteo in a single structured request
 * (including surface pressure and ICON-EU)
 */
export async function fetchMultiModelForecast(
  lat: number,
  lon: number,
  days: number = 3,
  signal?: AbortSignal
): Promise<OpenMeteoMultiModelResponse> {
  const boundedDays = Math.min(Math.max(1, Math.round(days)), 16);

  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly:
      'temperature_2m,precipitation,weathercode,windspeed_10m,cloudcover,surface_pressure',
    daily:
      'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max',
    models: SUPPORTED_MODELS.join(','),
    forecast_days: boundedDays.toString(),
    timezone: 'auto',
  });

  const url = `${FORECAST_API_URL}?${params.toString()}`;

  try {
    const response = await fetchWithRetry(url, { signal });

    if (!response.ok) {
      let reason = `HTTP hiba ${response.status} (${response.statusText})`;
      try {
        const errorBody = (await response.json()) as { reason?: string; error?: boolean };
        if (errorBody?.reason) {
          reason = errorBody.reason;
        }
      } catch {
        // use default reason if JSON parsing fails
      }
      throw new WeatherApiError(reason, response.status);
    }

    const data = (await response.json()) as OpenMeteoMultiModelResponse;

    if (!data.hourly || !Array.isArray(data.hourly.time)) {
      throw new WeatherApiError(
        'Érvénytelen válasz: hiányzó órás előrejelzési adatok az Open-Meteo szervertől.',
        502
      );
    }

    return data;
  } catch (error) {
    if (error instanceof WeatherApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new WeatherApiError('A kérés meg lett szakítva.', 0, 'ABORT_ERR');
    }
    const message = error instanceof Error ? error.message : 'Ismeretlen hálózati hiba';
    throw new WeatherApiError(
      `Nem sikerült lekérni az előrejelzést: ${message}`,
      undefined,
      'NETWORK_ERR'
    );
  }
}

/**
 * Search cities using Open-Meteo Geocoding API
 */
export async function searchCity(
  query: string,
  count: number = 6,
  signal?: AbortSignal
): Promise<GeoLocation[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const boundedCount = Math.min(Math.max(1, Math.round(count)), 20);

  const params = new URLSearchParams({
    name: trimmed,
    count: boundedCount.toString(),
    language: 'hu',
    format: 'json',
  });

  const url = `${GEOCODING_API_URL}?${params.toString()}`;

  try {
    const response = await fetchWithRetry(url, { signal });

    if (!response.ok) {
      throw new WeatherApiError(
        `A helymeghatározó szolgáltatás hibát adott: ${response.status}`,
        response.status
      );
    }

    const data = (await response.json()) as OpenMeteoGeocodingResponse;

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((r) => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      elevation: r.elevation ?? 0,
      country: r.country ?? '',
      countryCode: r.country_code ?? '',
      admin1: r.admin1,
      timezone: r.timezone || 'Europe/Budapest',
      population: r.population,
    }));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return [];
    }
    console.warn(`[searchCity] Nem sikerült lekérdezni a várost: "${trimmed}":`, error);
    return [];
  }
}
