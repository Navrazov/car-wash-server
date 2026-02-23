/**
 * Геокодирование через Яндекс Geocoder API с кешированием в MongoDB.
 */

import axios from 'axios';
import GeocodingCache from '@models/GeocodingCache.model';

const YANDEX_API_KEY = process.env.YANDEX_GEOCODER_API_KEY;
const YANDEX_GEOCODE_URL = 'https://geocode-maps.yandex.ru/1.x/';
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const TIMEOUT = 5000;
const CACHE_TTL_DAYS = 30;

/** Страны: название на русском + ISO 3166-1 alpha-2 */
export const COUNTRIES: { name: string; code: string }[] = [
  { name: 'Россия', code: 'ru' },
  { name: 'Казахстан', code: 'kz' },
  { name: 'Беларусь', code: 'by' },
  { name: 'Украина', code: 'ua' },
  { name: 'Узбекистан', code: 'uz' },
  { name: 'Азербайджан', code: 'az' },
  { name: 'Грузия', code: 'ge' },
  { name: 'Армения', code: 'am' },
  { name: 'Кыргызстан', code: 'kg' },
  { name: 'Таджикистан', code: 'tj' },
  { name: 'Туркменистан', code: 'tm' },
  { name: 'Молдова', code: 'md' },
  { name: 'Латвия', code: 'lv' },
  { name: 'Литва', code: 'lt' },
  { name: 'Эстония', code: 'ee' },
  { name: 'Германия', code: 'de' },
  { name: 'Франция', code: 'fr' },
  { name: 'Великобритания', code: 'gb' },
  { name: 'Италия', code: 'it' },
  { name: 'Испания', code: 'es' },
  { name: 'Польша', code: 'pl' },
  { name: 'Турция', code: 'tr' },
  { name: 'США', code: 'us' },
  { name: 'Китай', code: 'cn' },
  { name: 'Другая', code: '' },
];

export interface CountrySuggestion { displayName: string; code: string; }
export interface CitySuggestion {
  displayName: string;
  subtitle: string;
  fullName: string;
  lat: number;
  lng: number;
  countryCode?: string;
  countryName?: string;
}
export interface AddressSuggestion {
  displayName: string;
  shortDisplay: string;
  lat: number;
  lng: number;
}

// ── Yandex API types ─────────────────────────────────────────

interface YandexComponent {
  kind: string;
  name: string;
}

interface YandexGeoObject {
  name: string;
  description?: string;
  Point: { pos: string }; // "lng lat"
  metaDataProperty: {
    GeocoderMetaData: {
      kind: string;
      text: string;
      Address: {
        formatted: string;
        Components: YandexComponent[];
      };
    };
  };
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
}

// ── helpers ──────────────────────────────────────────────────

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я\s,.-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreAddressMatch(query: string, displayName: string, shortDisplay?: string): number {
  const normalizedQuery = normalizeSearchText(query);
  const candidate = normalizeSearchText(`${shortDisplay ?? ''} ${displayName}`.trim());
  if (!normalizedQuery) return 0;
  if (!candidate) return Number.POSITIVE_INFINITY;

  let score = 0;
  const queryHasDigits = /\d/.test(normalizedQuery);
  const candidateHasDigits = /\d/.test(candidate);

  if (queryHasDigits && !candidateHasDigits) {
    score += 120;
  }

  if (candidate.startsWith(normalizedQuery)) {
    score -= 35;
  } else if (candidate.includes(normalizedQuery)) {
    score -= 15;
  } else {
    score += 40;
  }

  const tokens = normalizedQuery.split(' ').filter((t) => t.length > 1);
  for (const token of tokens) {
    if (!candidate.includes(token)) {
      score += 14;
    }
  }

  score += Math.abs(candidate.length - normalizedQuery.length) * 0.05;
  return score;
}

function sortByAddressRelevance<T extends { displayName: string; shortDisplay?: string }>(
  query: string,
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const aScore = scoreAddressMatch(query, a.displayName, a.shortDisplay);
    const bScore = scoreAddressMatch(query, b.displayName, b.shortDisplay);
    return aScore - bScore;
  });
}

function cacheExpiry(): Date {
  return new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function parseCoords(pos: string): { lat: number; lng: number } {
  const [lngStr, latStr] = pos.split(' ');
  return { lat: parseFloat(latStr), lng: parseFloat(lngStr) };
}

function getComponent(components: YandexComponent[], kind: string): string | undefined {
  return components.find(c => c.kind === kind)?.name;
}

function getCountryName(code: string): string | undefined {
  return COUNTRIES.find(c => c.code === code)?.name;
}

/** Запрос к Яндекс Геокодеру */
async function yandexGeocode(geocodeQuery: string, results = 10): Promise<YandexGeoObject[]> {
  if (!YANDEX_API_KEY) {
    return nominatimSearchAsYandex(geocodeQuery, results);
  }

  try {
    const { data } = await axios.get(YANDEX_GEOCODE_URL, {
      params: {
        apikey: YANDEX_API_KEY,
        geocode: geocodeQuery,
        format: 'json',
        lang: 'ru_RU',
        results,
      },
      timeout: TIMEOUT,
    });

    return data?.response?.GeoObjectCollection?.featureMember?.map(
      (fm: { GeoObject: YandexGeoObject }) => fm.GeoObject
    ) ?? [];
  } catch {
    return nominatimSearchAsYandex(geocodeQuery, results);
  }
}

async function nominatimSearchAsYandex(query: string, results: number): Promise<YandexGeoObject[]> {
  const { data } = await axios.get<NominatimItem[]>(NOMINATIM_SEARCH_URL, {
    params: {
      q: query,
      format: 'jsonv2',
      limit: results,
      'accept-language': 'ru',
      addressdetails: 1,
    },
    timeout: TIMEOUT,
    headers: {
      'User-Agent': 'car-wash-server/2.0 (geocoding-fallback)',
    },
  });

  const inferKind = (type?: string): string => {
    const t = (type || '').toLowerCase();
    if (['city', 'town', 'village', 'hamlet', 'municipality'].includes(t)) return 'locality';
    if (['state', 'region', 'province'].includes(t)) return 'province';
    return 'house';
  };

  return (data || []).map((item) => ({
    name: item.display_name.split(',')[0] || item.display_name,
    description: item.display_name,
    Point: { pos: `${item.lon} ${item.lat}` },
    metaDataProperty: {
      GeocoderMetaData: {
        kind: inferKind(item.type),
        text: item.display_name,
        Address: {
          formatted: item.display_name,
          Components: [],
        },
      },
    },
  }));
}

/** Геокодирование с кешем */
async function geocodeWithCache(
  query: string,
  queryType: 'forward' | 'cities' | 'addresses',
  limit: number,
  transform: (objects: YandexGeoObject[]) => Array<{ displayName: string; shortDisplay?: string; lat: number; lng: number; [k: string]: unknown }>,
  cacheVersion = 'v1',
): Promise<Array<{ displayName: string; shortDisplay?: string; lat: number; lng: number; [k: string]: unknown }>> {
  const key = `${cacheVersion}:${normalizeKey(query)}`;

  // Проверяем кеш
  const cached = await GeocodingCache.findOne({ queryKey: key, queryType }).lean();
  if (cached) return cached.results;

  // Запрос к Яндексу
  const objects = await yandexGeocode(query, limit);
  const results = transform(objects);

  // Сохраняем в кеш (upsert — на случай гонки)
  if (results.length > 0) {
    await GeocodingCache.updateOne(
      { queryKey: key, queryType },
      { $set: { results: results.map(r => ({ displayName: r.displayName, shortDisplay: r.shortDisplay, lat: r.lat, lng: r.lng })), expiresAt: cacheExpiry() } },
      { upsert: true },
    ).catch(() => {});
  }

  return results;
}

// ── countries ────────────────────────────────────────────────

export function getCountries(q?: string): CountrySuggestion[] {
  const query = (q ?? '').trim().toLowerCase();
  const list = query.length < 1
    ? COUNTRIES
    : COUNTRIES.filter((c) => c.name.toLowerCase().includes(query));
  return list.map((c) => ({ displayName: c.name, code: c.code }));
}

// ── cities ───────────────────────────────────────────────────

export async function getCities(countryCode: string | undefined, q: string): Promise<CitySuggestion[]> {
  const trimmed = (q ?? '').trim();
  if (trimmed.length < 2) return [];

  const countryName = countryCode ? getCountryName(countryCode) : undefined;
  const searchQuery = countryName ? `${countryName}, ${trimmed}` : trimmed;

  try {
    const key = normalizeKey(searchQuery);

    // Проверяем кеш
    const cached = await GeocodingCache.findOne({ queryKey: key, queryType: 'cities' }).lean();
    if (cached) {
      return cached.results.map(r => ({
        displayName: r.displayName,
        subtitle: r.shortDisplay || '',
        fullName: r.displayName,
        lat: r.lat,
        lng: r.lng,
        countryCode,
        countryName,
      }));
    }

    // Запрос к Яндексу
    const objects = await yandexGeocode(searchQuery, 10);

    const seen = new Set<string>();
    const results: CitySuggestion[] = [];
    const cacheResults: Array<{ displayName: string; shortDisplay: string; lat: number; lng: number }> = [];

    for (const obj of objects) {
      const meta = obj.metaDataProperty.GeocoderMetaData;
      const components = meta.Address.Components;
      const kind = meta.kind;

      if (kind !== 'locality' && kind !== 'province' && kind !== 'area') continue;

      const coords = parseCoords(obj.Point.pos);
      if (Number.isNaN(coords.lat) || Number.isNaN(coords.lng)) continue;

      const cityName = obj.name;
      const dupKey = cityName.toLowerCase().trim();
      if (seen.has(dupKey)) continue;
      seen.add(dupKey);

      const subtitle = obj.description || '';
      results.push({
        displayName: cityName,
        subtitle,
        fullName: meta.text,
        lat: coords.lat,
        lng: coords.lng,
        countryCode,
        countryName: getComponent(components, 'country'),
      });
      cacheResults.push({ displayName: cityName, shortDisplay: subtitle, lat: coords.lat, lng: coords.lng });
    }

    // Сохраняем в кеш
    if (cacheResults.length > 0) {
      await GeocodingCache.updateOne(
        { queryKey: key, queryType: 'cities' },
        { $set: { results: cacheResults, expiresAt: cacheExpiry() } },
        { upsert: true },
      ).catch(() => {});
    }

    return results.slice(0, 10);
  } catch {
    return [];
  }
}

// ── addresses ────────────────────────────────────────────────

export async function searchAddresses(
  query: string,
  city?: string,
  countryCode?: string,
  limit = 10,
): Promise<AddressSuggestion[]> {
  const trimmed = (query ?? '').trim();
  if (trimmed.length < 2) return [];

  const countryName = countryCode ? getCountryName(countryCode) : undefined;
  const parts = [countryName, city, trimmed].filter(Boolean);
  const searchQuery = parts.join(', ');

  try {
    const results = await geocodeWithCache(searchQuery, 'addresses', limit, (objects) => {
      const seen = new Set<string>();
      const items: Array<{ displayName: string; shortDisplay: string; lat: number; lng: number }> = [];

      for (const obj of objects) {
        const meta = obj.metaDataProperty.GeocoderMetaData;
        const components = meta.Address.Components;
        const coords = parseCoords(obj.Point.pos);
        if (Number.isNaN(coords.lat) || Number.isNaN(coords.lng)) continue;

        const street = getComponent(components, 'street') ?? '';
        const house = getComponent(components, 'house') ?? '';
        const locality = getComponent(components, 'locality') ?? '';
        const streetPart = [street, house].filter(Boolean).join(', ');
        const short = [streetPart, locality].filter(Boolean).join(', ') || obj.name;

        const dupKey = short.toLowerCase();
        if (seen.has(dupKey)) continue;
        seen.add(dupKey);

        items.push({
          displayName: meta.Address.formatted,
          shortDisplay: short,
          lat: coords.lat,
          lng: coords.lng,
        });
      }

      return items;
    }, 'addresses-v2');

    const normalizedQuery = trimmed.toLowerCase();
    const queryHasNumber = /\d/.test(normalizedQuery);
    const rankQuery = [countryName, city, trimmed].filter(Boolean).join(' ');

    const ranked = sortByAddressRelevance(
      rankQuery,
      results
      .map(r => ({
      displayName: r.displayName,
      shortDisplay: r.shortDisplay || r.displayName,
      lat: r.lat,
      lng: r.lng,
      }))
      .filter((item) => {
        if (!queryHasNumber) return true;
        const text = `${item.shortDisplay} ${item.displayName}`.toLowerCase();
        return /\d/.test(text);
      }),
    );

    return ranked.slice(0, limit);
  } catch {
    return [];
  }
}

// ── forward geocode (single result) ─────────────────────────

export async function forwardGeocode(
  address: string,
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const trimmed = (address ?? '').trim();
  if (trimmed.length < 3) return null;

  try {
    const results = await geocodeWithCache(trimmed, 'forward', 5, (objects) => {
      const mapped = objects
        .map((obj) => {
          const coords = parseCoords(obj.Point.pos);
          if (Number.isNaN(coords.lat) || Number.isNaN(coords.lng)) return null;
          return {
            displayName: obj.metaDataProperty.GeocoderMetaData.Address.formatted,
            shortDisplay: obj.name,
            lat: coords.lat,
            lng: coords.lng,
          };
        })
        .filter((item): item is { displayName: string; shortDisplay: string; lat: number; lng: number } => Boolean(item));

      return sortByAddressRelevance(trimmed, mapped).slice(0, 5);
    }, 'forward-v2');

    if (results.length === 0) return null;
    return { lat: results[0].lat, lng: results[0].lng, displayName: results[0].displayName };
  } catch {
    return null;
  }
}

// ── reverse geocode (coords -> address) ─────────────────────

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  try {
    if (YANDEX_API_KEY) {
      const query = `${lng},${lat}`;
      const objects = await yandexGeocode(query, 1);
      if (objects.length > 0) {
        const obj = objects[0];
        const coords = parseCoords(obj.Point.pos);
        if (!Number.isNaN(coords.lat) && !Number.isNaN(coords.lng)) {
          return {
            lat: coords.lat,
            lng: coords.lng,
            displayName: obj.metaDataProperty.GeocoderMetaData.Address.formatted || obj.name,
          };
        }
      }
    }

    const { data } = await axios.get<{ lat: string; lon: string; display_name: string }>(NOMINATIM_REVERSE_URL, {
      params: {
        lat,
        lon: lng,
        format: 'jsonv2',
        'accept-language': 'ru',
      },
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'car-wash-server/2.0 (geocoding-fallback)',
      },
    });
    const parsedLat = parseFloat(data.lat);
    const parsedLng = parseFloat(data.lon);
    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) return null;
    return {
      lat: parsedLat,
      lng: parsedLng,
      displayName: data.display_name,
    };
  } catch {
    return null;
  }
}
