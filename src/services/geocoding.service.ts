/**
 * Геокодирование: списки стран и городов/адресов (Nominatim).
 * Оптимизировано: параллельные запросы, короткие таймауты, countrycodes всегда задан.
 */

import axios from 'axios';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_HEADERS = {
  'Accept-Language': 'ru',
  'User-Agent': 'CarWashServer/1.0 (https://github.com/carwash)',
};
const TIMEOUT = 5000; // 5 seconds — fast timeout

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

// ── helpers ──────────────────────────────────────────────────

function getShortCityName(item: { display_name?: string; address?: Record<string, string | undefined> }): string {
  const addr = item?.address;
  if (!addr) return item.display_name ?? '';
  return (addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.state ?? item.display_name ?? '').trim();
}

function getSubtitle(item: { address?: Record<string, string | undefined> }): string {
  const addr = item?.address;
  if (!addr) return '';
  const parts: string[] = [];
  if (addr.state_district && addr.state_district !== addr.state) parts.push(addr.state_district);
  if (addr.state) parts.push(addr.state);
  if (addr.country) parts.push(addr.country);
  return parts.filter(Boolean).join(', ');
}

function buildShortAddress(item: { display_name?: string; address?: Record<string, string | undefined> }): string {
  const addr = item.address;
  if (!addr) return item.display_name ?? '';
  const road = addr.road ?? addr.pedestrian ?? addr.footway ?? '';
  const house = addr.house_number ?? '';
  const streetPart = [road, house].filter(Boolean).join(', ');
  const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? '';
  const parts = [streetPart, city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : (item.display_name ?? '');
}

async function nominatimGet(params: Record<string, string>) {
  const { data } = await axios.get(NOMINATIM_BASE, { params, headers: NOMINATIM_HEADERS, timeout: TIMEOUT });
  return Array.isArray(data) ? data : [];
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

/**
 * Подсказки городов. Один запрос с featuretype=city + countrycodes.
 * С countrycodes запрос быстрый (~1-2с вместо 5-10с).
 */
export async function getCities(countryCode: string | undefined, q: string): Promise<CitySuggestion[]> {
  const trimmed = (q ?? '').trim();
  if (trimmed.length < 2) return [];

  const params: Record<string, string> = {
    q: trimmed,
    format: 'json',
    limit: '10',
    addressdetails: '1',
    featuretype: 'city',
  };
  if (countryCode) params.countrycodes = countryCode;

  try {
    const items = await nominatimGet(params);

    const seen = new Set<string>();
    const results: CitySuggestion[] = [];

    for (const item of items) {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

      const shortName = getShortCityName(item);
      if (!shortName) continue;

      const key = shortName.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);

      const addr = item.address ?? {};
      results.push({
        displayName: shortName,
        subtitle: getSubtitle(item),
        fullName: item.display_name ?? '',
        lat,
        lng,
        countryCode: (addr.country_code as string) || undefined,
        countryName: (addr.country as string) || undefined,
      });
    }

    return results.slice(0, 10);
  } catch {
    return [];
  }
}

// ── addresses ────────────────────────────────────────────────

const RU_STREET_PREFIXES = ['улица', 'ул', 'ул.', 'проспект', 'пр', 'пр.', 'переулок', 'пер', 'пер.', 'бульвар', 'бул', 'бул.', 'шоссе', 'ш', 'ш.', 'набережная', 'наб', 'наб.', 'площадь', 'пл', 'пл.', 'проезд'];

function hasStreetPrefix(q: string): boolean {
  const lower = q.toLowerCase();
  return RU_STREET_PREFIXES.some(p => lower.startsWith(p + ' ') || lower.startsWith(p + '.'));
}

/**
 * Поиск адресов. Запускает 2 запроса параллельно (с «улица» и без) — берёт первый ответ.
 * countryCode обязателен для скорости.
 */
export async function searchAddresses(
  query: string,
  city?: string,
  countryCode?: string,
  limit = 10,
): Promise<AddressSuggestion[]> {
  const trimmed = (query ?? '').trim();
  if (trimmed.length < 2) return [];

  const seen = new Set<string>();
  const results: AddressSuggestion[] = [];

  function pushItems(data: unknown[]) {
    for (const item of data) {
      const lat = parseFloat((item as any).lat);
      const lng = parseFloat((item as any).lon);
      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
      const short = buildShortAddress(item as any);
      const key = short.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        displayName: (item as any).display_name ?? '',
        shortDisplay: short,
        lat,
        lng,
      });
    }
  }

  const base: Record<string, string> = {
    format: 'json',
    limit: String(limit),
    addressdetails: '1',
  };
  if (countryCode) base.countrycodes = countryCode;

  // Запускаем 2 запроса ПАРАЛЛЕЛЬНО — это главная оптимизация.
  // Вместо 4 последовательных запросов по 5с = 20с, делаем 2 параллельных по 5с = 5с.
  const queries: Record<string, string>[] = [];

  // Запрос 1: с «улица» (если пользователь не ввёл префикс) или прямой
  if (!hasStreetPrefix(trimmed) && city) {
    queries.push({ ...base, q: `улица ${trimmed} ${city}` });
  }

  // Запрос 2: прямой «<query> <city>»
  const directQ = city ? `${trimmed} ${city}` : trimmed;
  queries.push({ ...base, q: directQ });

  // Запускаем параллельно
  const settled = await Promise.allSettled(queries.map(p => nominatimGet(p)));

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      pushItems(result.value);
    }
  }

  return results.slice(0, limit);
}
