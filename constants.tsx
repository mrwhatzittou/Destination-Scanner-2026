
import { Country, Airport, AirportInfo } from './types';

export const COUNTRIES: Country[] = [
  { code: 'JP', name: 'Japan', flag: '🇯🇵', popularityScore: 95 },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', popularityScore: 88 },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', popularityScore: 92 },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', popularityScore: 90 },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', popularityScore: 85 },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', popularityScore: 82 },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', popularityScore: 87 },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', popularityScore: 84 },
  { code: 'US', name: 'United States', flag: '🇺🇸', popularityScore: 98 },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', popularityScore: 94 },
  { code: 'FR', name: 'France', flag: '🇫🇷', popularityScore: 97 },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', popularityScore: 96 },
];

// Mapping Country -> Cities/Airports for precise recommendations
export const COUNTRY_AIRPORTS: Record<string, AirportInfo[]> = {
  'JP': [{ city: 'Tokyo', iata: 'NRT' }, { city: 'Tokyo', iata: 'HND' }, { city: 'Osaka', iata: 'KIX' }],
  'SG': [{ city: 'Singapore', iata: 'SIN' }],
  'TH': [{ city: 'Bangkok', iata: 'BKK' }, { city: 'Phuket', iata: 'HKT' }],
  'KR': [{ city: 'Seoul', iata: 'ICN' }, { city: 'Busan', iata: 'PUS' }],
  'TW': [{ city: 'Taipei', iata: 'TPE' }],
  'VN': [{ city: 'Hanoi', iata: 'HAN' }, { city: 'Ho Chi Minh', iata: 'SGN' }],
  'ID': [{ city: 'Jakarta', iata: 'CGK' }, { city: 'Bali', iata: 'DPS' }],
  'AU': [{ city: 'Sydney', iata: 'SYD' }, { city: 'Melbourne', iata: 'MEL' }],
  'US': [{ city: 'Los Angeles', iata: 'LAX' }, { city: 'New York', iata: 'JFK' }, { city: 'San Francisco', iata: 'SFO' }],
  'GB': [{ city: 'London', iata: 'LHR' }, { city: 'Manchester', iata: 'MAN' }],
  'FR': [{ city: 'Paris', iata: 'CDG' }, { city: 'Nice', iata: 'NCE' }],
  'IT': [{ city: 'Rome', iata: 'FCO' }, { city: 'Milan', iata: 'MXP' }],
};

export const AIRLINES = [
  "Philippine Airlines", "Cebu Pacific", "AirAsia", "Singapore Airlines",
  "Japan Airlines", "Cathay Pacific", "EVA Air", "Korean Air", "Qantas", "Emirates"
];

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const PRICE_WEIGHT = 0.75;
export const QUALITY_WEIGHT = 0.25;
export const TIE_THRESHOLD_PCT = 0.03;
export const USD_TO_PHP = 56.45;
