
import { Passengers, CabinClass } from '../types';

/**
 * Builds a more structured Google Flights deep link.
 * Uses the 'q' parameter which is generally more stable for pre-filling
 * across mobile/desktop when provided with explicit keyword syntax.
 */
export const getGoogleFlightsUrl = (
  origin: string,
  dest: string,
  depart: string,
  ret: string | undefined,
  cabin: CabinClass,
  passengers: Passengers,
  airlineCarrierIata?: string
) => {
  const cabinMap: Record<string, string> = {
    'ECONOMY': 'economy',
    'PREMIUM_ECONOMY': 'premium economy',
    'BUSINESS': 'business',
    'FIRST': 'first'
  };

  const cabinStr = cabinMap[cabin] || 'economy';
  
  const pParts = [];
  if (passengers.adults > 0) pParts.push(`${passengers.adults} adult${passengers.adults > 1 ? 's' : ''}`);
  if (passengers.children > 0) pParts.push(`${passengers.children} child${passengers.children > 1 ? 'ren' : ''}`);
  if (passengers.infantsInSeat > 0) pParts.push(`${passengers.infantsInSeat} infant${passengers.infantsInSeat > 1 ? 's' : ''} in seat`);
  if (passengers.infantsOnLap > 0) pParts.push(`${passengers.infantsOnLap} infant${passengers.infantsOnLap > 1 ? 's' : ''} on lap`);
  
  const paxStr = pParts.length > 0 ? ` for ${pParts.join(', ')}` : '';
  const returnStr = ret ? ` returning ${ret}` : ' one way';
  const carrierStr = airlineCarrierIata ? ` with airline ${airlineCarrierIata}` : '';
  
  // Explicitly use "from [IATA] to [IATA]" to force Google into the right route
  const query = `Flights from ${origin} to ${dest} on ${depart}${returnStr}${carrierStr}${paxStr} in ${cabinStr} class`;
  
  const url = new URL("https://www.google.com/travel/flights");
  url.searchParams.set("q", query);
  
  return url.toString();
};

/**
 * Generates a clean text summary for the user to manually enter 
 * if the deep link fails to prefill correctly.
 */
export const getSearchDetailsSummary = (
  origin: string,
  dest: string,
  depart: string,
  ret: string | undefined,
  cabin: CabinClass,
  passengers: Passengers,
  airline?: string
) => {
  return `
--- Search Details ---
Origin: ${origin}
Destination: ${dest}
Depart Date: ${depart}
Return Date: ${ret || 'N/A (One Way)'}
Cabin: ${cabin}
Passengers: Adults (${passengers.adults}), Children (${passengers.children}), Infants (${passengers.infantsInSeat + passengers.infantsOnLap})
Preferred Airline: ${airline || 'Any'}
  `.trim();
};
