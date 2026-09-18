/**
 * OmniForecast - Core Mathematical Consensus & Uncertainty Aggregation Engine
 * Optimized for Hungary & Central European Meteorology
 */

import type {
  AggregatedForecast,
  AstronomyInfo,
  ConfidenceInfo,
  ConfidenceLevel,
  ConfidenceStatus,
  DailyConsensusSummary,
  FrontEffect,
  HourlyConsensusPoint,
  ModelDataPoint,
  ModelPeriodSummary,
  OpenMeteoMultiModelResponse,
  StationMetadata,
  WeatherCodeDetails,
  WeatherModel,
} from '../types/weather';
import { SUPPORTED_MODELS } from '../types/weather';
import { HU_WMO_WEATHER_CODES, HU_TEXTS } from './i18n';

/**
 * 1. Model Weighting Constants
 *
 * Operational weights optimized for Central Europe & Hungary:
 * - ECMWF IFS: 0.35 (Arany standard európai globális modell)
 * - DWD ICON-EU: 0.30 (DWD ~7km felbontású Közép-Európai regionális modell)
 * - DWD ICON: 0.20 (DWD ~13km globális modell)
 * - Météo-France: 0.15 (Európai ARPEGE modellcsomag)
 */
export const MODEL_WEIGHTS: Readonly<Record<WeatherModel, number>> = {
  ecmwf_ifs025: 0.35,
  dwd_icon_eu: 0.3,
  dwd_icon: 0.2,
  meteofrance_seamless: 0.15,
};

/**
 * Priority order for tie-breaking: ECMWF IFS first, followed by ICON-EU, ICON, Météo-France.
 */
const TIE_BREAK_ORDER: readonly WeatherModel[] = [
  'ecmwf_ifs025',
  'dwd_icon_eu',
  'dwd_icon',
  'meteofrance_seamless',
];

/**
 * Dynamically re-normalizes weights across available models so the sum equals 1.0.
 */
export function normalizeWeights(
  availableModels: WeatherModel[]
): Map<WeatherModel, number> {
  const normalized = new Map<WeatherModel, number>();
  if (availableModels.length === 0) {
    return normalized;
  }

  const totalRawWeight = availableModels.reduce(
    (sum, model) => sum + (MODEL_WEIGHTS[model] ?? 0),
    0
  );

  if (totalRawWeight <= 0) {
    const equalWeight = 1 / availableModels.length;
    for (const model of availableModels) {
      normalized.set(model, equalWeight);
    }
    return normalized;
  }

  for (const model of availableModels) {
    const rawWeight = MODEL_WEIGHTS[model] ?? 0;
    normalized.set(model, rawWeight / totalRawWeight);
  }

  return normalized;
}

/**
 * Standard deviation: sqrt( sum( (x_i - mean)^2 ) / N )
 */
export function calculateStdDev(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Mathematical median of an array of numbers
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid]!;
  }
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Classify confidence score into Hungarian status and presentation styling
 */
export function classifyConfidence(score: number): ConfidenceInfo {
  const boundedScore = Math.min(100, Math.max(0, Math.round(score)));

  let status: ConfidenceStatus;
  let level: ConfidenceLevel;
  let badgeClass: string;

  if (boundedScore >= 85) {
    status = HU_TEXTS.confidenceHigh as ConfidenceStatus;
    level = 'high';
    badgeClass =
      'text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-800';
  } else if (boundedScore >= 70) {
    status = HU_TEXTS.confidenceModerate as ConfidenceStatus;
    level = 'moderate';
    badgeClass =
      'text-amber-700 bg-amber-50 border-amber-300 dark:text-amber-800';
  } else {
    status = HU_TEXTS.confidenceLow as ConfidenceStatus;
    level = 'low';
    badgeClass =
      'text-rose-700 bg-rose-50 border-rose-300 dark:text-rose-800';
  }

  return {
    score: boundedScore,
    level,
    status,
    badgeClass,
  };
}

/**
 * Map WMO Weather Code to Hungarian label and Lucide icon name
 */
export function getWeatherCodeDetails(code: number): WeatherCodeDetails {
  const item = HU_WMO_WEATHER_CODES[code];
  if (item) {
    return {
      code,
      label: item.label,
      iconName: item.iconName,
      category: item.category,
    };
  }

  return {
    code,
    label: `Időjáráskód ${code}`,
    iconName: 'Cloud',
    category: 'cloudy',
  };
}

/**
 * Determine dominant weather code across reporting models.
 * Takes the mode (most frequent WMO code). If tied, prefers ECMWF IFS.
 */
export function computeDominantWeatherCode(
  modelCodes: Array<{ model: WeatherModel; code: number }>
): number {
  if (modelCodes.length === 0) {
    return 0;
  }

  const frequencyMap = new Map<number, number>();
  for (const item of modelCodes) {
    const current = frequencyMap.get(item.code) ?? 0;
    frequencyMap.set(item.code, current + 1);
  }

  let highestFreq = 0;
  for (const freq of frequencyMap.values()) {
    if (freq > highestFreq) {
      highestFreq = freq;
    }
  }

  const tiedCodes = Array.from(frequencyMap.entries())
    .filter(([, freq]) => freq === highestFreq)
    .map(([code]) => code);

  if (tiedCodes.length === 1) {
    return tiedCodes[0]!;
  }

  for (const preferredModel of TIE_BREAK_ORDER) {
    const match = modelCodes.find(
      (item) => item.model === preferredModel && tiedCodes.includes(item.code)
    );
    if (match !== undefined) {
      return match.code;
    }
  }

  return tiedCodes[0]!;
}

/**
 * Safely extract number at array index
 */
function getValidNumber(
  source: Record<string, (number | null)[] | string[]> | undefined,
  key: string,
  index: number
): number | null {
  if (!source || !source[key] || !Array.isArray(source[key])) {
    return null;
  }
  const val = source[key]![index];
  if (val === null || val === undefined || typeof val !== 'number' || !Number.isFinite(val)) {
    return null;
  }
  return val;
}

/**
 * Hourly Consensus Computation
 */
export function computeHourlyConsensus(
  raw: OpenMeteoMultiModelResponse
): HourlyConsensusPoint[] {
  if (!raw.hourly || !Array.isArray(raw.hourly.time)) {
    return [];
  }

  const times = raw.hourly.time;
  const result: HourlyConsensusPoint[] = [];

  for (let i = 0; i < times.length; i++) {
    const time = times[i]!;

    const availableModels: WeatherModel[] = [];
    const modelPoints: Record<WeatherModel, ModelDataPoint | null> = {
      ecmwf_ifs025: null,
      dwd_icon_eu: null,
      dwd_icon: null,
      meteofrance_seamless: null,
    };

    const tempValues: number[] = [];
    const precipValues: number[] = [];
    const windValues: number[] = [];
    const pressureValues: number[] = [];
    const weatherCodes: Array<{ model: WeatherModel; code: number }> = [];

    for (const model of SUPPORTED_MODELS) {
      const temp = getValidNumber(raw.hourly, `temperature_2m_${model}`, i);
      const precip = getValidNumber(raw.hourly, `precipitation_${model}`, i);
      const wind = getValidNumber(raw.hourly, `windspeed_10m_${model}`, i);
      const code = getValidNumber(raw.hourly, `weathercode_${model}`, i);
      const cloud = getValidNumber(raw.hourly, `cloudcover_${model}`, i);
      const pressure = getValidNumber(raw.hourly, `surface_pressure_${model}`, i);

      if (temp !== null) {
        availableModels.push(model);
        const point: ModelDataPoint = {
          model,
          temperature: temp,
          precipitation: precip ?? 0,
          windSpeed: wind ?? 0,
          weatherCode: code ?? 0,
          cloudCover: cloud ?? 0,
          pressure: pressure ?? 1013.25,
        };
        modelPoints[model] = point;

        tempValues.push(temp);
        precipValues.push(precip ?? 0);
        windValues.push(wind ?? 0);
        if (pressure !== null) {
          pressureValues.push(pressure);
        }
        weatherCodes.push({ model, code: code ?? 0 });
      }
    }

    const weightsMap = normalizeWeights(availableModels);

    if (availableModels.length === 0) {
      result.push({
        time,
        weightedTemperature: 0,
        tempMin: 0,
        tempMax: 0,
        tempSpread: 0,
        stdDev: 0,
        confidenceScore: 10,
        confidenceStatus: HU_TEXTS.confidenceLow as ConfidenceStatus,
        precipitationProbability: 0,
        precipitationAmount: 0,
        weightedWindSpeed: 0,
        weightedPressure: 1013.2,
        dominantWeatherCode: 0,
        weatherDescription: 'Tiszta égbolt',
        weatherIcon: 'Sun',
        models: modelPoints,
        activeModelCount: 0,
      });
      continue;
    }

    // 1. Weighted Temperature
    const weightedTemperature = Number(
      availableModels
        .reduce((sum, model) => {
          const pt = modelPoints[model]!;
          const w = weightsMap.get(model) ?? 0;
          return sum + pt.temperature * w;
        }, 0)
        .toFixed(2)
    );

    // 2. tempMin & tempMax & tempSpread
    const tempMin = Number(Math.min(...tempValues).toFixed(2));
    const tempMax = Number(Math.max(...tempValues).toFixed(2));
    const tempSpread = Number((tempMax - tempMin).toFixed(2));

    // 3. Standard Deviation
    const stdDev = Number(calculateStdDev(tempValues).toFixed(2));

    // 4. Confidence Score: Math.max(10, Math.round(100 - (stdDev * 15))), clamped <= 100
    const rawConfidence = Math.round(100 - stdDev * 15);
    const confidenceScore = Math.min(100, Math.max(10, rawConfidence));
    const { status: confidenceStatus } = classifyConfidence(confidenceScore);

    // 5. Precipitation Probability: % of models predicting >= 0.1 mm
    const precipGte01Count = precipValues.filter((p) => p >= 0.1).length;
    const precipitationProbability = Math.round(
      (precipGte01Count / availableModels.length) * 100
    );

    // 6. Precipitation Amount: Median of all non-zero predictions (fallback to 0)
    const nonZeroPrecips = precipValues.filter((p) => p > 0);
    const precipitationAmount =
      nonZeroPrecips.length > 0
        ? Number(calculateMedian(nonZeroPrecips).toFixed(2))
        : 0;

    // 7. Weighted Wind Speed
    const weightedWindSpeed = Number(
      availableModels
        .reduce((sum, model) => {
          const pt = modelPoints[model]!;
          const w = weightsMap.get(model) ?? 0;
          return sum + pt.windSpeed * w;
        }, 0)
        .toFixed(2)
    );

    // 8. Weighted Surface Pressure
    const weightedPressure = Number(
      availableModels
        .reduce((sum, model) => {
          const pt = modelPoints[model]!;
          const w = weightsMap.get(model) ?? 0;
          return sum + pt.pressure * w;
        }, 0)
        .toFixed(1)
    );

    // 9. Dominant Weather Code
    const dominantWeatherCode = computeDominantWeatherCode(weatherCodes);
    const weatherDetails = getWeatherCodeDetails(dominantWeatherCode);

    result.push({
      time,
      weightedTemperature,
      tempMin,
      tempMax,
      tempSpread,
      stdDev,
      confidenceScore,
      confidenceStatus,
      precipitationProbability,
      precipitationAmount,
      weightedWindSpeed,
      weightedPressure,
      dominantWeatherCode,
      weatherDescription: weatherDetails.label,
      weatherIcon: weatherDetails.iconName,
      models: modelPoints,
      activeModelCount: availableModels.length,
    });
  }

  return result;
}

/**
 * Daily Consensus Summary
 */
export function computeDailyConsensus(
  hourlyPoints: HourlyConsensusPoint[]
): DailyConsensusSummary[] {
  if (hourlyPoints.length === 0) {
    return [];
  }

  const daysMap = new Map<string, HourlyConsensusPoint[]>();

  for (const point of hourlyPoints) {
    const date = point.time.slice(0, 10);
    const list = daysMap.get(date) ?? [];
    list.push(point);
    daysMap.set(date, list);
  }

  const summaries: DailyConsensusSummary[] = [];

  for (const [date, hours] of daysMap.entries()) {
    if (hours.length === 0) {
      continue;
    }

    const tempMin = Number(Math.min(...hours.map((h) => h.tempMin)).toFixed(2));
    const tempMax = Number(Math.max(...hours.map((h) => h.tempMax)).toFixed(2));

    const totalPrecipitation = Number(
      hours.reduce((acc, h) => acc + h.precipitationAmount, 0).toFixed(2)
    );

    const avgConfidence = Math.round(
      hours.reduce((acc, h) => acc + h.confidenceScore, 0) / hours.length
    );
    const { status: confidenceStatus } = classifyConfidence(avgConfidence);

    const hourlyCodeCounts = new Map<number, number>();
    for (const h of hours) {
      const c = hourlyCodeCounts.get(h.dominantWeatherCode) ?? 0;
      hourlyCodeCounts.set(h.dominantWeatherCode, c + 1);
    }
    let maxCount = -1;
    let dominantCode = hours[0]!.dominantWeatherCode;
    for (const [code, count] of hourlyCodeCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantCode = code;
      }
    }
    const weatherDetails = getWeatherCodeDetails(dominantCode);

    summaries.push({
      date,
      tempMin,
      tempMax,
      totalPrecipitation,
      averageConfidenceScore: avgConfidence,
      confidenceStatus,
      dominantWeatherCode: dominantCode,
      weatherDescription: weatherDetails.label,
      weatherIcon: weatherDetails.iconName,
      hourlyPoints: hours,
    });
  }

  return summaries;
}

/**
 * Locate the index in hourly times array that corresponds to current real-time.
 */
export function findCurrentHourIndex(
  times: string[],
  currentTimeStr?: string,
  utcOffsetSeconds: number = 0
): number {
  if (times.length === 0) return 0;

  if (currentTimeStr) {
    const idx = times.indexOf(currentTimeStr);
    if (idx !== -1) return idx;

    // Match by "YYYY-MM-DDTHH" prefix
    const prefix = currentTimeStr.slice(0, 13);
    const prefixIdx = times.findIndex((t) => t.startsWith(prefix));
    if (prefixIdx !== -1) return prefixIdx;
  }

  // Fallback: compute local time using utcOffsetSeconds
  const now = new Date();
  const localEpoch = now.getTime() + utcOffsetSeconds * 1000;
  const localDate = new Date(localEpoch);
  const isoLocalPrefix = localDate.toISOString().slice(0, 13);

  const fallbackIdx = times.findIndex((t) => t.startsWith(isoLocalPrefix));
  if (fallbackIdx !== -1) return fallbackIdx;

  // Otherwise pick the time point closest to now
  let closestIdx = 0;
  let minDiff = Infinity;
  const nowMs = Date.now();
  for (let i = 0; i < times.length; i++) {
    const tMs = Date.parse(times[i]!);
    if (!Number.isNaN(tMs)) {
      const diff = Math.abs(tMs - nowMs);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
  }
  return closestIdx;
}

/**
 * Calculate aggregated statistics for an individual model across a time horizon.
 */
export function calculateModelPeriodSummary(
  hourlyPoints: HourlyConsensusPoint[],
  modelKey: WeatherModel,
  horizon: 'most' | '24h' | '72h',
  startIndex: number = 0
): ModelPeriodSummary {
  const currentPt = hourlyPoints[startIndex]?.models[modelKey];
  const count = horizon === 'most' ? 1 : horizon === '24h' ? 24 : 72;
  const windowPoints = hourlyPoints.slice(startIndex, startIndex + count);

  const modelPoints = windowPoints
    .map((p) => p.models[modelKey])
    .filter((pt): pt is ModelDataPoint => pt !== null && pt !== undefined);

  if (modelPoints.length === 0) {
    return {
      model: modelKey,
      tempMin: currentPt?.temperature ?? 0,
      tempMax: currentPt?.temperature ?? 0,
      tempAvg: currentPt?.temperature ?? 0,
      totalPrecipitation: currentPt?.precipitation ?? 0,
      maxWindSpeed: currentPt?.windSpeed ?? 0,
      avgWindSpeed: currentPt?.windSpeed ?? 0,
      avgPressure: currentPt?.pressure ?? 1013.2,
      currentTemp: currentPt?.temperature,
      currentPrecip: currentPt?.precipitation,
      currentWind: currentPt?.windSpeed,
      currentPressure: currentPt?.pressure,
      currentWeatherCode: currentPt?.weatherCode,
    };
  }

  const temps = modelPoints.map((p) => p.temperature);
  const precips = modelPoints.map((p) => p.precipitation);
  const winds = modelPoints.map((p) => p.windSpeed);
  const pressures = modelPoints.map((p) => p.pressure);

  const tempMin = Number(Math.min(...temps).toFixed(1));
  const tempMax = Number(Math.max(...temps).toFixed(1));
  const tempAvg = Number((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1));
  const totalPrecipitation = Number(precips.reduce((a, b) => a + b, 0).toFixed(1));
  const maxWindSpeed = Number(Math.max(...winds).toFixed(0));
  const avgWindSpeed = Number((winds.reduce((a, b) => a + b, 0) / winds.length).toFixed(0));
  const avgPressure = Number((pressures.reduce((a, b) => a + b, 0) / pressures.length).toFixed(1));

  return {
    model: modelKey,
    tempMin,
    tempMax,
    tempAvg,
    totalPrecipitation,
    maxWindSpeed,
    avgWindSpeed,
    avgPressure,
    currentTemp: currentPt?.temperature,
    currentPrecip: currentPt?.precipitation,
    currentWind: currentPt?.windSpeed,
    currentPressure: currentPt?.pressure,
    currentWeatherCode: currentPt?.weatherCode,
  };
}

/**
 * Astronomical Moon Phase Calculator
 */
export function calculateMoonPhase(date: Date = new Date()): {
  phase: number;
  percentage: number;
  trend: '↑' | '↓';
  glyph: string;
  name: string;
  iconName: string;
} {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime();
  const lunarCycle = 29.53058867 * 86400 * 1000;
  const diff = (date.getTime() - knownNewMoon) % lunarCycle;
  const phase = (diff < 0 ? diff + lunarCycle : diff) / lunarCycle;

  // Illumination percentage (0% at new moon, 100% at full moon)
  const percentage = Math.round(
    phase <= 0.5 ? phase * 200 : (1 - phase) * 200
  );

  // Trend direction: waxing (↑) up to full moon (phase <= 0.5), waning (↓) afterwards
  const trend: '↑' | '↓' = phase <= 0.5 ? '↑' : '↓';

  let name: string;
  let glyph: string;
  let iconName: string;

  if (phase < 0.03 || phase >= 0.97) {
    name = 'Újhold';
    glyph = '🌑';
    iconName = 'Circle';
  } else if (phase < 0.22) {
    name = 'Növekvő sarló';
    glyph = '🌒';
    iconName = 'Moon';
  } else if (phase < 0.28) {
    name = 'Első negyed';
    glyph = '🌓';
    iconName = 'Moon';
  } else if (phase < 0.47) {
    name = 'Növekvő hold';
    glyph = '🌔';
    iconName = 'Moon';
  } else if (phase < 0.53) {
    name = 'Telihold';
    glyph = '🌕';
    iconName = 'Sun';
  } else if (phase < 0.72) {
    name = 'Fogyó hold';
    glyph = '🌖';
    iconName = 'Moon';
  } else if (phase < 0.78) {
    name = 'Utolsó negyed';
    glyph = '🌗';
    iconName = 'Moon';
  } else {
    name = 'Fogyó sarló';
    glyph = '🌘';
    iconName = 'Moon';
  }

  return {
    phase: Number(phase.toFixed(2)),
    percentage,
    trend,
    glyph,
    name,
    iconName,
  };
}

/**
 * Biometeorological Front Effect (Fronthatás) Calculator
 * Analyzes barometric pressure trends (ΔP over 6h), temperature shifts, and variance.
 *
 * Fronts:
 * - Cold front (❄️): ΔP > +1.5 hPa or sharp temperature plunge
 * - Warm front (🔥): ΔP < -1.5 hPa or sharp temperature surge
 * - Mixed/Double front (❄️🔥): volatile pressure with high model variance (σ > 2.0°C)
 * - None (—): steady barometric field (|ΔP| <= 1.0 hPa)
 */
export function calculateFrontEffect(
  hourlyPoints: HourlyConsensusPoint[],
  targetIndex: number = 0
): FrontEffect {
  if (hourlyPoints.length === 0) {
    return {
      type: 'none',
      icon: '—',
      label: 'Nincs fronthatás',
      severity: 'mild',
      deltaPressure6h: 0,
    };
  }

  const currentPt = hourlyPoints[targetIndex] || hourlyPoints[0]!;

  // Determine a 6-hour evaluation window centered around targetIndex if possible
  const startIdx = Math.max(0, Math.min(hourlyPoints.length - 7, Math.max(0, targetIndex - 3)));
  const endIdx = Math.min(hourlyPoints.length - 1, startIdx + 6);

  const startPressure =
    hourlyPoints[startIdx]?.weightedPressure ?? currentPt.weightedPressure ?? 1013.25;
  const endPressure =
    hourlyPoints[endIdx]?.weightedPressure ?? currentPt.weightedPressure ?? 1013.25;
  const deltaP = Number((endPressure - startPressure).toFixed(1));

  const startTemp =
    hourlyPoints[startIdx]?.weightedTemperature ?? currentPt.weightedTemperature;
  const endTemp =
    hourlyPoints[endIdx]?.weightedTemperature ?? currentPt.weightedTemperature;
  const deltaT = Number((endTemp - startTemp).toFixed(1));

  // High model spread/variance often marks an occluded or complex frontal zone
  const isVolatile = currentPt.stdDev > 2.0 || currentPt.tempSpread > 4.0;

  if (isVolatile && Math.abs(deltaP) >= 1.0) {
    return {
      type: 'mixed',
      icon: '❄️🔥',
      label: 'Kettős front',
      severity: Math.abs(deltaP) > 2.5 ? 'strong' : 'moderate',
      deltaPressure6h: deltaP,
    };
  }

  if (deltaP >= 1.5 || (deltaP >= 0.8 && deltaT <= -3.0)) {
    return {
      type: 'cold',
      icon: '❄️',
      label: 'Hidegfront',
      severity: deltaP > 2.5 ? 'strong' : 'moderate',
      deltaPressure6h: deltaP,
    };
  }

  if (deltaP <= -1.5 || (deltaP <= -0.8 && deltaT >= 3.0)) {
    return {
      type: 'warm',
      icon: '🔥',
      label: 'Melegfront',
      severity: deltaP < -2.5 ? 'strong' : 'moderate',
      deltaPressure6h: deltaP,
    };
  }

  return {
    type: 'none',
    icon: '—',
    label: 'Nincs fronthatás',
    severity: 'mild',
    deltaPressure6h: deltaP,
  };
}

/**
 * Convert wind direction degrees to Hungarian 16-point compass abbreviation
 */
export function getWindDirectionCompass(degrees?: number): string {
  if (degrees === undefined || degrees === null || !Number.isFinite(degrees)) {
    return 'Változó';
  }
  const normalized = ((degrees % 360) + 360) % 360;
  const directions = [
    'É', 'ÉÉK', 'ÉK', 'KÉK',
    'K', 'KDK', 'DK', 'DDK',
    'D', 'DDNy', 'DNy', 'NyDNy',
    'Ny', 'NyÉNy', 'ÉNy', 'ÉÉNy',
  ];
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index] || 'É';
}

/**
 * Master aggregation function
 */
export function aggregateForecast(
  raw: OpenMeteoMultiModelResponse,
  locationName: string = 'Budapest'
): AggregatedForecast {
  const hourly = computeHourlyConsensus(raw);
  const daily = computeDailyConsensus(hourly);
  const currentHourIndex = findCurrentHourIndex(
    raw.hourly?.time || [],
    raw.current?.time,
    raw.utc_offset_seconds || 0
  );
  const currentSnapshot = hourly[currentHourIndex] || hourly[0];

  // Extract sunrise / sunset
  let sunriseStr = '06:25';
  let sunsetStr = '18:50';
  if (raw.daily?.sunrise && Array.isArray(raw.daily.sunrise) && raw.daily.sunrise[0]) {
    const s = raw.daily.sunrise[0];
    sunriseStr = s.includes('T') ? s.split('T')[1]?.slice(0, 5) ?? '06:25' : s.slice(0, 5);
  }
  if (raw.daily?.sunset && Array.isArray(raw.daily.sunset) && raw.daily.sunset[0]) {
    const s = raw.daily.sunset[0];
    sunsetStr = s.includes('T') ? s.split('T')[1]?.slice(0, 5) ?? '18:50' : s.slice(0, 5);
  }

  const moonPhase = calculateMoonPhase(new Date());
  const frontEffect = calculateFrontEffect(hourly, currentHourIndex);

  const astronomy: AstronomyInfo = {
    sunrise: sunriseStr,
    sunset: sunsetStr,
    moonPhase,
    frontEffect,
  };

  // Extract timestamp for measurement
  let timestampStr = '12:00';
  if (raw.current?.time) {
    const t = raw.current.time;
    timestampStr = t.includes('T') ? t.split('T')[1]?.slice(0, 5) ?? '12:00' : t.slice(0, 5);
  } else if (currentSnapshot?.time) {
    const t = currentSnapshot.time;
    timestampStr = t.includes('T') ? t.split('T')[1]?.slice(0, 5) ?? '12:00' : t.slice(0, 5);
  }

  const windDirectionCompass = getWindDirectionCompass(raw.current?.winddirection_10m);

  const latStr = `${Math.abs(raw.latitude).toFixed(2)}°${raw.latitude >= 0 ? 'É' : 'D'}`;
  const lonStr = `${Math.abs(raw.longitude).toFixed(2)}°${raw.longitude >= 0 ? 'K' : 'Ny'}`;

  const stationMetadata: StationMetadata = {
    source: 'DWD / HungaroMet / ECMWF felszíni mérőhálózat',
    stationName: `${locationName} automata mérőállomás`,
    coordinates: `${latStr}, ${lonStr}`,
    elevation: Math.round(raw.elevation || 105),
    timestamp: timestampStr,
    windDirectionCompass,
    windDirectionDeg: raw.current?.winddirection_10m,
    humidity: raw.current?.relative_humidity_2m,
  };

  return {
    location: {
      latitude: raw.latitude,
      longitude: raw.longitude,
      elevation: raw.elevation,
      timezone: raw.timezone,
      timezoneAbbreviation: raw.timezone_abbreviation,
      utcOffsetSeconds: raw.utc_offset_seconds,
    },
    currentHourIndex,
    currentSnapshot,
    hourly,
    daily,
    astronomy,
    stationMetadata,
    generatedAt: new Date().toISOString(),
    rawResponse: raw,
  };
}
