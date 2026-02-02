/**
 * Геокодирование: списки стран (фильтр на бэке) и городов (Nominatim, короткое название без округов).
 */

import axios from 'axios';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_HEADERS = {
  'Accept-Language': 'ru',
  'User-Agent': 'CarWashServer/1.0 (https://github.com/carwash)',
};

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

export interface CountrySuggestion {
  displayName: string;
  code: string;
}

export interface CitySuggestion {
  /** Название города (как в Яндексе — title) */
  displayName: string;
  /** Регион, страна (как в Яндексе — subtitle) */
  subtitle: string;
  fullName: string;
  lat: number;
  lng: number;
  countryCode?: string;
  countryName?: string;
}

/** Извлечь короткое название города из ответа Nominatim (без округов, областей и т.д.) */
function getShortCityName(item: {
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
    [key: string]: string | undefined;
  };
}): string {
  const addr = item?.address;
  if (!addr) return item.display_name ?? '';
  const name =
    addr.city ??
    addr.town ??
    addr.village ??
    addr.municipality ??
    addr.state ??
    '';
  return name.trim() || (item.display_name ?? '');
}

/** Subtitle как в Яндексе: регион, область, страна (без города) */
function getSubtitle(item: {
  address?: {
    state?: string;
    country?: string;
    state_district?: string;
    [key: string]: string | undefined;
  };
}): string {
  const addr = item?.address;
  if (!addr) return '';
  const parts: string[] = [];
  if (addr.state_district && addr.state_district !== addr.state) parts.push(addr.state_district);
  if (addr.state) parts.push(addr.state);
  if (addr.country) parts.push(addr.country);
  return parts.filter(Boolean).join(', ');
}

/** Список стран с фильтрацией на бэке. q — опциональный поиск. */
export function getCountries(q?: string): CountrySuggestion[] {
  const query = (q ?? '').trim().toLowerCase();
  const list = query.length < 1
    ? COUNTRIES.slice(0, 15)
    : COUNTRIES.filter((c) => c.name.toLowerCase().includes(query)).slice(0, 15);
  return list.map((c) => ({ displayName: c.name, code: c.code }));
}

/** Подсказки городов через Nominatim (как suggest-geo в Яндексе). title = город, subtitle = регион, страна. countryCode опционален — без него поиск по всему миру. */
export async function getCities(countryCode: string | undefined, q: string): Promise<CitySuggestion[]> {
  const trimmed = (q ?? '').trim();
  if (trimmed.length < 2) return [];

  const params: Record<string, string> = {
    q: trimmed,
    format: 'json',
    limit: '10',
    addressdetails: '1',
  };
  if (countryCode) params.countrycodes = countryCode;

  try {
    const { data } = await axios.get<
      Array<{
        lat: string;
        lon: string;
        display_name?: string;
        address?: Record<string, string>;
      }>
    >(NOMINATIM_BASE, { params, headers: NOMINATIM_HEADERS, timeout: 8000 });
    if (!Array.isArray(data)) return [];

    const results: CitySuggestion[] = [];
    for (const item of data) {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
      const shortName = getShortCityName(item);
      if (!shortName) continue;
      const addr = item.address ?? {};
      results.push({
        displayName: shortName || item.display_name || '',
        subtitle: getSubtitle(item),
        fullName: item.display_name ?? '',
        lat,
        lng,
        countryCode: (addr.country_code as string) || undefined,
        countryName: (addr.country as string) || undefined,
      });
    }
    return results;
  } catch {
    return [];
  }
}
