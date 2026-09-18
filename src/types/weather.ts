/**
 * OmniForecast - Core Weather & Consensus Domain Types (Central Europe & Hungary Focus)
 */

/**
 * The 4 supported meteorological models (tailored for Hungary & Central Europe):
 * - ECMWF IFS 0.25° (European Centre for Medium-Range Weather Forecasts)
 * - DWD ICON-EU (Deutscher Wetterdienst high-res ~7km regional model for Central Europe)
 * - DWD ICON (Deutscher Wetterdienst ~13km global model)
 * - Météo-France Seamless (Météo-France European ARPEGE blended suite)
 */
export type WeatherModel =
  | 'ecmwf_ifs025'
  | 'dwd_icon_eu'
  | 'dwd_icon'
  | 'meteofrance_seamless';

export const SUPPORTED_MODELS: readonly WeatherModel[] = [
  'ecmwf_ifs025',
  'dwd_icon_eu',
  'dwd_icon',
  'meteofrance_seamless',
] as const;

export interface WeatherModelInfo {
  id: WeatherModel;
  name: string;
  shortName: string;
  agency: string;
  country: string;
  resolutionKm: number;
  defaultWeight: number;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  description: string;
}

export const WEATHER_MODEL_REGISTRY: Record<WeatherModel, WeatherModelInfo> = {
  ecmwf_ifs025: {
    id: 'ecmwf_ifs025',
    name: 'ECMWF IFS (0.25°)',
    shortName: 'ECMWF',
    agency: 'European Centre for Medium-Range Weather Forecasts',
    country: 'Európa',
    resolutionKm: 25,
    defaultWeight: 0.35,
    color: '#0284c7', // sky-600
    badgeBg: 'rgba(2, 132, 199, 0.1)',
    badgeBorder: 'rgba(2, 132, 199, 0.3)',
    description: 'Arany standard globális numerikus időjárás-előrejelző rendszer.',
  },
  dwd_icon_eu: {
    id: 'dwd_icon_eu',
    name: 'DWD ICON-EU (7km)',
    shortName: 'ICON-EU',
    agency: 'Deutscher Wetterdienst (DWD)',
    country: 'Közép-Európa / DWD',
    resolutionKm: 7,
    defaultWeight: 0.3,
    color: '#4f46e5', // indigo-600
    badgeBg: 'rgba(79, 70, 229, 0.1)',
    badgeBorder: 'rgba(79, 70, 229, 0.3)',
    description: 'Nagyfelbontású regionális modell Közép-Európára és a Kárpát-medencére.',
  },
  dwd_icon: {
    id: 'dwd_icon',
    name: 'DWD ICON Globális',
    shortName: 'ICON-GLO',
    agency: 'Deutscher Wetterdienst (DWD)',
    country: 'Németország',
    resolutionKm: 13,
    defaultWeight: 0.2,
    color: '#0d9488', // teal-600
    badgeBg: 'rgba(13, 148, 136, 0.1)',
    badgeBorder: 'rgba(13, 148, 136, 0.3)',
    description: 'Nem-hidrosztatikus globális légköri előrejelző modell.',
  },
  meteofrance_seamless: {
    id: 'meteofrance_seamless',
    name: 'Météo-France ARPEGE',
    shortName: 'Météo-FR',
    agency: 'Météo-France',
    country: 'Franciaország',
    resolutionKm: 10,
    defaultWeight: 0.15,
    color: '#d97706', // amber-600
    badgeBg: 'rgba(217, 119, 6, 0.1)',
    badgeBorder: 'rgba(217, 119, 6, 0.3)',
    description: 'Nagy pontosságú európai ARPEGE numerikus modellcsomag.',
  },
};

/**
 * Forecast Variables requested from Open-Meteo
 */
export type HourlyWeatherVariable =
  | 'temperature_2m'
  | 'precipitation'
  | 'weathercode'
  | 'windspeed_10m'
  | 'cloudcover'
  | 'surface_pressure';

export type DailyWeatherVariable =
  | 'temperature_2m_max'
  | 'temperature_2m_min'
  | 'precipitation_sum'
  | 'weathercode'
  | 'windspeed_10m_max';

/**
 * Dynamic keys as formatted by Open-Meteo multi-model endpoint:
 * e.g. `temperature_2m_ecmwf_ifs025`
 */
export type HourlyModelKey<
  V extends HourlyWeatherVariable = HourlyWeatherVariable,
  M extends WeatherModel = WeatherModel,
> = `${V}_${M}`;

export type DailyModelKey<
  V extends DailyWeatherVariable = DailyWeatherVariable,
  M extends WeatherModel = WeatherModel,
> = `${V}_${M}`;

/**
 * Raw Open-Meteo REST API Response Schema
 */
export interface OpenMeteoHourlyRaw {
  time: string[];
  [key: string]: (number | null)[] | string[];
}

export interface OpenMeteoDailyRaw {
  time: string[];
  [key: string]: (number | null)[] | string[];
}

export interface OpenMeteoMultiModelResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  hourly_units: Record<string, string>;
  hourly: OpenMeteoHourlyRaw;
  daily_units?: Record<string, string>;
  daily?: OpenMeteoDailyRaw;
}

/**
 * Open-Meteo Geocoding API Schema
 */
export interface OpenMeteoGeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  feature_code?: string;
  country_code?: string;
  country?: string;
  country_id?: number;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  admin4?: string;
  timezone: string;
  population?: number;
  postcodes?: string[];
}

export interface OpenMeteoGeocodingResponse {
  results?: OpenMeteoGeocodingResult[];
  generationtime_ms?: number;
}

/**
 * Unified Domain Models
 */

export interface GeoLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  country: string;
  countryCode: string;
  admin1?: string;
  timezone: string;
  population?: number;
}

/**
 * Point forecast from a single weather model at a given timestamp
 */
export interface ModelDataPoint {
  model: WeatherModel;
  temperature: number; // °C
  precipitation: number; // mm
  weatherCode: number; // WMO code (0-99)
  windSpeed: number; // km/h
  cloudCover: number; // % (0-100)
  pressure: number; // hPa (surface pressure)
}

/**
 * Statistical summary metric across multiple models for a single variable
 */
export interface ConsensusMetric {
  value: number; // Weighted consensus value
  mean: number; // Simple arithmetic mean
  median: number; // 50th percentile
  min: number; // Minimum model prediction
  max: number; // Maximum model prediction
  spread: number; // Uncertainty spread (max - min)
  stdDev: number; // Standard deviation between models
  bandLower: number; // lower uncertainty bound
  bandUpper: number; // upper uncertainty bound
}

/**
 * Step 2 & 3 Aggregator Types
 */
export type ConfidenceStatus =
  | 'Magas konszenzus (Megbízható)'
  | 'Mérsékelt konszenzus'
  | 'Alacsony konszenzus (Nagy bizonytalanság)';

export type ConfidenceLevel = 'high' | 'moderate' | 'low';

export interface ConfidenceInfo {
  score: number;
  level: ConfidenceLevel;
  status: ConfidenceStatus;
  badgeClass: string;
}

export interface WeatherCodeDetails {
  code: number;
  label: string;
  iconName: string; // Lucide icon name, e.g. "Sun", "CloudSun", "CloudRain", etc.
  category: 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunderstorm';
}

export interface HourlyConsensusPoint {
  time: string;
  weightedTemperature: number;
  tempMin: number;
  tempMax: number;
  tempSpread: number;
  stdDev: number;
  confidenceScore: number;
  confidenceStatus: ConfidenceStatus;
  precipitationProbability: number; // 0 to 100%
  precipitationAmount: number; // mm
  weightedWindSpeed: number; // km/h
  weightedPressure: number; // hPa
  dominantWeatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  models: Record<WeatherModel, ModelDataPoint | null>;
  activeModelCount: number;
}

export interface DailyConsensusSummary {
  date: string;
  tempMin: number;
  tempMax: number;
  totalPrecipitation: number; // sum of hourly medians
  averageConfidenceScore: number;
  confidenceStatus: ConfidenceStatus;
  dominantWeatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  hourlyPoints: HourlyConsensusPoint[];
}

export interface AggregatedForecast {
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
    timezone: string;
    timezoneAbbreviation: string;
    utcOffsetSeconds: number;
  };
  hourly: HourlyConsensusPoint[];
  daily: DailyConsensusSummary[];
  generatedAt: string;
  rawResponse?: OpenMeteoMultiModelResponse;
}
