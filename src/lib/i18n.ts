/**
 * OmniForecast - Magyar Nyelvi Lokalizáció és Szótár (Hungarian Localization)
 */

export const HU_TEXTS = {
  appTitle: 'METSZET',
  footer: '2026 AmaihAIku',

  // Time Horizons
  horizonMost: 'Most',
  horizon24h: '24 óra',
  horizon72h: '72 óra',

  // Actions & Buttons
  sourcesButton: 'Források',
  backButton: 'Vissza',
  searchPlaceholder: 'Város keresése...',
  refresh: 'Frissítés',
  retry: 'Újrapróbálkozás',

  // Metrics & Weather Parameters
  temperature: 'Hőmérséklet',
  precipitation: 'Csapadék',
  windSpeed: 'Szélsebesség',
  pressure: 'Légnyomás',
  uncertainty: 'Bizonytalanság',
  spread: 'Szórás',
  confidence: 'Konszenzus',
  rainChance: 'Csapadékesély',
  expectedRain: 'Várható csapadék',
  weightedConsensus: 'Súlyozott konszenzus',
  range: 'Tartomány',
  modelSpread: 'Modell eltérés',

  // Statuses & Units
  unitTemp: '°C',
  unitPrecip: 'mm',
  unitWind: 'km/h',
  unitPressure: 'hPa',

  // Confidence Levels
  confidenceHigh: 'Magas konszenzus (Megbízható)',
  confidenceModerate: 'Mérsékelt konszenzus',
  confidenceLow: 'Alacsony konszenzus (Nagy bizonytalanság)',

  // Orientation Lockout
  orientationTitle: 'Kérjük, fordítsd álló helyzetbe!',
  orientationDesc:
    'A Metszet optimális megtekintéséhez kérjük, tartsd a készüléked álló (portrait) tájolásban.',

  // Sources View
  sourcesTitle: 'Időjárás-modell Források',
  sourcesSubtitle: '4 független meteorológiai modell nyers előrejelzési adatai',
  modelWeight: 'Súlyozás',
  resolution: 'Felbontás',
  agency: 'Szolgáltató',
  origin: 'Származás',

  // Empty / Error states
  loadingMessage: 'Meteorológiai modellek adatainak feldolgozása...',
  errorMessage: 'Nem sikerült betölteni az előrejelzési adatokat.',
  noData: 'Nincs elérhető előrejelzési adat.',
};

/**
 * WMO Időjáráskódok hivatalos magyar fordítása
 */
export const HU_WMO_WEATHER_CODES: Record<
  number,
  { label: string; iconName: string; category: 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunderstorm' }
> = {
  0: { label: 'Tiszta égbolt', iconName: 'Sun', category: 'clear' },
  1: { label: 'Túlnyomóan derült', iconName: 'Sun', category: 'clear' },
  2: { label: 'Változóan felhős', iconName: 'CloudSun', category: 'cloudy' },
  3: { label: 'Borult', iconName: 'Cloud', category: 'cloudy' },
  45: { label: 'Köd', iconName: 'CloudFog', category: 'fog' },
  48: { label: 'Zúzmarás köd', iconName: 'CloudFog', category: 'fog' },
  51: { label: 'Gyenge szitálás', iconName: 'CloudDrizzle', category: 'drizzle' },
  53: { label: 'Mérsékelt szitálás', iconName: 'CloudDrizzle', category: 'drizzle' },
  55: { label: 'Sűrű szitálás', iconName: 'CloudDrizzle', category: 'drizzle' },
  56: { label: 'Gyenge ónos szitálás', iconName: 'CloudSnow', category: 'drizzle' },
  57: { label: 'Sűrű ónos szitálás', iconName: 'CloudSnow', category: 'drizzle' },
  61: { label: 'Gyenge eső', iconName: 'CloudRain', category: 'rain' },
  63: { label: 'Mérsékelt eső', iconName: 'CloudRain', category: 'rain' },
  65: { label: 'Heves esőzés', iconName: 'CloudRain', category: 'rain' },
  66: { label: 'Gyenge ónos eső', iconName: 'CloudSnow', category: 'rain' },
  67: { label: 'Intenzív ónos eső', iconName: 'CloudSnow', category: 'rain' },
  71: { label: 'Gyenge havazás', iconName: 'CloudSnow', category: 'snow' },
  73: { label: 'Mérsékelt havazás', iconName: 'CloudSnow', category: 'snow' },
  75: { label: 'Heves havazás', iconName: 'CloudSnow', category: 'snow' },
  77: { label: 'Hódara / Szemcsés hó', iconName: 'CloudSnow', category: 'snow' },
  80: { label: 'Gyenge zápor', iconName: 'CloudRain', category: 'rain' },
  81: { label: 'Mérsékelt zápor', iconName: 'CloudRain', category: 'rain' },
  82: { label: 'Heves felhőszakadás', iconName: 'CloudLightning', category: 'rain' },
  85: { label: 'Gyenge hózápor', iconName: 'CloudSnow', category: 'snow' },
  86: { label: 'Heves hózápor', iconName: 'CloudSnow', category: 'snow' },
  95: { label: 'Zivatar', iconName: 'CloudLightning', category: 'thunderstorm' },
  96: { label: 'Zivatar apró jéggel', iconName: 'CloudHail', category: 'thunderstorm' },
  99: { label: 'Heves zivatar jégesővel', iconName: 'CloudHail', category: 'thunderstorm' },
};

