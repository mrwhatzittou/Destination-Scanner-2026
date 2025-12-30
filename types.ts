
export type CabinClass = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
export type PriceConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type ValidationStatus = 'VALID' | 'QUARANTINED';

export interface Passengers {
  adults: number;
  children: number;
  infantsInSeat: number;
  infantsOnLap: number;
}

export interface FlightSegment {
  carrierIata: string;
  flightNumber: string;
  fromIata: string;
  toIata: string;
  departAt: string;
  arriveAt: string;
  durationMin: number;
}

export interface FlightSlice {
  direction: 'outbound' | 'inbound';
  segments: FlightSegment[];
  totalDurationMin: number;
  stopsCount: number;
}

export interface OfferPrice {
  total: number;
  currency: string;
  totalPHP: number;
  fxRate: number;
  fxTimestamp: string;
  includesTaxesAndFees: boolean;
}

export interface OfferCanonical {
  id: string;
  provider: string;
  tripType: 'round_trip' | 'one_way';
  originIata: string;
  destinationIata: string;
  departDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  passengers: Passengers;
  cabin: CabinClass;
  price: OfferPrice;
  slices: FlightSlice[];
  meta: {
    isSeparateTickets: boolean;
    isLcc: boolean;
    baggageUnknown: boolean;
  };
  validation: {
    status: ValidationStatus;
    reasonCodes: string[];
    confidence: PriceConfidence;
  };
}

export interface MarketPricePoint {
  month: string; // YYYY-MM
  monthName: string; // Jan, Feb...
  cheapest: number | null;
  recommended: number | null;
  verified: number | null;
  confidence: PriceConfidence;
  updatedAt: string;
}

export interface MonthRecommendation {
  month: number; // 0-11
  country: {
    code: string;
    name: string;
    flag: string;
  };
  cheapest: OfferCanonical;
  recommended: OfferCanonical;
  lastRefreshed: string;
  isUserVerified?: boolean;
  verifiedType?: 'CHEAPEST' | 'RECOMMENDED';
  verifiedPrice?: number;
  verifiedAt?: string;
}

export interface TrackedQuery {
  id: string;
  origin: string;
  tripLengthNights: number;
  cabin: CabinClass;
  maxStops: number;
  diversify: boolean;
  passengers: Passengers;
  budget?: number;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  popularityScore: number;
}

export interface AirportInfo {
  city: string;
  iata: string;
}

export interface Airport {
  iata: string;
  name: string;
  city: string;
}

export interface VerificationReport {
  id: string;
  offerId: string;
  offerType: 'CHEAPEST' | 'RECOMMENDED';
  originIata: string;
  destinationIata: string;
  departDate: string;
  returnDate?: string;
  cabin: CabinClass;
  passengers: Passengers;
  appPricePhp: number;
  gfPriceSeenPhp?: number;
  gfSameDatesConfirmed: boolean;
  gfPrefillFailed: boolean;
  notes?: string;
  createdAt: string;
}
