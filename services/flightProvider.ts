
import { 
  TrackedQuery, MonthRecommendation, OfferCanonical, 
  PriceConfidence, MarketPricePoint, Passengers, FlightSlice, FlightSegment, ValidationStatus 
} from '../types';
import { COUNTRIES, COUNTRY_AIRPORTS, PRICE_WEIGHT, QUALITY_WEIGHT, MONTH_NAMES, USD_TO_PHP, AIRLINES } from '../constants';

// Data Integrity Helpers
const LONG_HAUL_THRESHOLD_KM = 5000;
const IMPOSSIBLE_PH_SFO_PRICE = 15000; // Impossible RT price for MNL-SFO

export class FlightProvider {
  /**
   * Main entry point for monthly dashboard.
   * Ensures every recommendation is VALID and passes plausibility checks.
   */
  async getMonthlyRecommendations(params: TrackedQuery): Promise<MonthRecommendation[]> {
    await new Promise(r => setTimeout(r, 1000)); 
    
    const allMonthsRecs: MonthRecommendation[] = [];
    const countryUsage: Record<string, number> = {};

    for (let month = 0; month < 12; month++) {
      const candidates: { country: any; cheapest: OfferCanonical; recommended: OfferCanonical; score: number }[] = [];

      for (const country of COUNTRIES) {
        const airports = COUNTRY_AIRPORTS[country.code] || [];
        const validOffers: OfferCanonical[] = [];

        for (let a = 0; a < 5; a++) {
          const day = Math.min(28, 1 + Math.floor((a / 4) * 27));
          for (const air of airports) {
            const rawOffers = this.generateRawMockOffers(params, month, day, air.iata, air.city);
            
            for (const raw of rawOffers) {
              const normalized = this.normalizeOffer(raw);
              const validated = this.validateOffer(normalized);
              
              if (validated.validation.status === 'VALID') {
                validOffers.push(validated);
              }
            }
          }
        }

        if (validOffers.length === 0) continue;

        // Scoring
        const scored = validOffers.map(o => ({
          offer: o,
          score: this.calculateOfferScore(o)
        }));

        const cheapest = [...scored].sort((a, b) => a.offer.price.totalPHP - b.offer.price.totalPHP)[0].offer;
        const recommended = [...scored].sort((a, b) => a.score - b.score)[0].offer;
        
        candidates.push({ country, cheapest, recommended, score: this.calculateOfferScore(recommended) });
      }

      if (candidates.length === 0) continue;

      candidates.sort((a, b) => a.score - b.score);
      let winner = candidates[0];
      
      if (params.diversify) {
        for (const cand of candidates) {
          if ((countryUsage[cand.country.code] || 0) < 2) {
            winner = cand;
            break;
          }
        }
      }

      countryUsage[winner.country.code] = (countryUsage[winner.country.code] || 0) + 1;

      allMonthsRecs.push({
        month,
        country: winner.country,
        cheapest: winner.cheapest,
        recommended: winner.recommended,
        lastRefreshed: new Date().toISOString()
      });
    }

    return allMonthsRecs;
  }

  async getYearlyTrend(params: TrackedQuery, destIata: string): Promise<MarketPricePoint[]> {
    await new Promise(r => setTimeout(r, 600));
    const series: MarketPricePoint[] = [];

    for (let month = 0; month < 12; month++) {
      // Create a representative validated offer for this month to get prices
      const raw = this.generateRawMockOffers(params, month, 15, destIata, "City")[0];
      const valid = this.validateOffer(this.normalizeOffer(raw));

      series.push({
        month: `2026-${String(month + 1).padStart(2, '0')}`,
        monthName: MONTH_NAMES[month].substring(0, 3),
        cheapest: valid.price.totalPHP,
        recommended: Math.round(valid.price.totalPHP * 1.1),
        verified: null,
        confidence: valid.validation.confidence,
        updatedAt: new Date().toISOString()
      });
    }

    return series;
  }

  // --- Normalization & Validation Logic ---

  private normalizeOffer(raw: any): OfferCanonical {
    const passengers = raw.passengers;
    const pMult = passengers.adults + (passengers.children * 0.75) + ((passengers.infantsInSeat + passengers.infantsOnLap) * 0.1);
    const totalPHP = Math.round(raw.basePriceUsd * pMult * USD_TO_PHP);

    return {
      id: `offer-${Math.random().toString(36).substr(2, 9)}`,
      provider: 'AtlasProvider',
      tripType: 'round_trip',
      originIata: raw.origin,
      destinationIata: raw.dest,
      departDate: raw.departDate,
      returnDate: raw.returnDate,
      passengers,
      cabin: raw.cabin,
      price: {
        total: Math.round(raw.basePriceUsd * pMult),
        currency: 'USD',
        totalPHP,
        fxRate: USD_TO_PHP,
        fxTimestamp: new Date().toISOString(),
        includesTaxesAndFees: true
      },
      slices: raw.slices,
      meta: {
        isSeparateTickets: raw.isSeparate || false,
        isLcc: raw.isLcc || false,
        baggageUnknown: false
      },
      validation: {
        status: 'VALID',
        reasonCodes: [],
        confidence: 'HIGH'
      }
    };
  }

  private validateOffer(offer: OfferCanonical): OfferCanonical {
    const reasons: string[] = [];
    const origin = offer.originIata;
    const dest = offer.destinationIata;
    const price = offer.price.totalPHP;
    const airline = offer.slices[0].segments[0].carrierIata;

    // 1. Route Plausibility
    // MNL-SFO (or similar long haul) cannot be served by Cebu Pacific (5J)
    if (dest === 'SFO' || dest === 'LAX' || dest === 'JFK' || dest === 'LHR' || dest === 'CDG' || dest === 'FCO') {
      if (airline === '5J' || airline === 'AK') { // 5J=Cebu, AK=AirAsia
        reasons.push('INVALID_CARRIER_FOR_DISTANCE');
      }
      
      // 2. Price Sanity (Long Haul)
      if (price < IMPOSSIBLE_PH_SFO_PRICE) {
        reasons.push('OUTLIER_HARD_PRICE_TOO_LOW');
      }
    }

    // 3. Round Trip Completeness
    if (offer.tripType === 'round_trip' && offer.slices.length < 2) {
      reasons.push('MISSING_INBOUND_SLICE');
    }

    // 4. Segment Continuity
    offer.slices.forEach(slice => {
      slice.segments.forEach((seg, idx) => {
        if (idx > 0) {
          const prev = slice.segments[idx - 1];
          if (prev.toIata !== seg.fromIata) {
            reasons.push('INVALID_SEGMENT_CONNECTION');
          }
        }
      });
    });

    if (reasons.length > 0) {
      offer.validation.status = 'QUARANTINED';
      offer.validation.reasonCodes = reasons;
      offer.validation.confidence = 'LOW';
    }

    // Outlier Soft Check
    if (price < 5000 && (dest !== 'SIN' && dest !== 'HKG' && dest !== 'TPE')) {
      offer.validation.confidence = 'MEDIUM';
    }

    return offer;
  }

  private calculateOfferScore(offer: OfferCanonical): number {
    const p = offer.price.totalPHP;
    const stops = offer.slices[0].stopsCount + (offer.slices[1]?.stopsCount || 0);
    const duration = offer.slices[0].totalDurationMin + (offer.slices[1]?.totalDurationMin || 0);
    
    // Normalized score (lower is better)
    const normPrice = p / 50000;
    const normQuality = (stops * 5) + (duration / 600);
    
    return (PRICE_WEIGHT * normPrice) + (QUALITY_WEIGHT * normQuality);
  }

  private generateRawMockOffers(params: TrackedQuery, month: number, day: number, destIata: string, destCity: string) {
    const offers = [];
    const departDate = `2026-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const returnDate = `2026-${String(month + 1).padStart(2, '0')}-${String(day + params.tripLengthNights).padStart(2, '0')}`;

    // Generate 3 random airlines per date/dest
    for (let i = 0; i < 3; i++) {
      const airlineIdx = Math.floor(Math.random() * AIRLINES.length);
      const airlineName = AIRLINES[airlineIdx];
      
      // Determine Carrier IATA (Simplified map)
      let carrierIata = 'PR'; // Default PAL
      if (airlineName.includes('Cebu')) carrierIata = '5J';
      if (airlineName.includes('AirAsia')) carrierIata = 'AK';
      if (airlineName.includes('Singapore')) carrierIata = 'SQ';
      if (airlineName.includes('Japan')) carrierIata = 'JL';

      const isLongHaul = ['SFO', 'LAX', 'JFK', 'LHR', 'CDG', 'FCO'].includes(destIata);
      
      // Intentional buggy data generation for validator to catch
      let basePriceUsd = 200 + (Math.random() * 800);
      if (isLongHaul) basePriceUsd = 700 + (Math.random() * 1000);
      
      // Trigger a "bug" occasionally for testing quarantine
      if (Math.random() < 0.1 && isLongHaul) {
        basePriceUsd = 150; // Way too low for US
        carrierIata = '5J'; // Cebu Pacific doesn't fly MNL-SFO
      }

      offers.push({
        origin: params.origin,
        dest: destIata,
        city: destCity,
        departDate,
        returnDate,
        passengers: params.passengers,
        cabin: params.cabin,
        basePriceUsd,
        slices: [
          {
            direction: 'outbound',
            totalDurationMin: isLongHaul ? 900 : 200,
            stopsCount: isLongHaul ? 1 : 0,
            segments: [{
              carrierIata,
              flightNumber: `${carrierIata}${100 + i}`,
              fromIata: params.origin,
              toIata: destIata,
              departAt: `${departDate}T10:00:00`,
              arriveAt: `${departDate}T15:00:00`,
              durationMin: isLongHaul ? 900 : 200
            }]
          },
          {
            direction: 'inbound',
            totalDurationMin: isLongHaul ? 900 : 200,
            stopsCount: isLongHaul ? 1 : 0,
            segments: [{
              carrierIata,
              flightNumber: `${carrierIata}${200 + i}`,
              fromIata: destIata,
              toIata: params.origin,
              departAt: `${returnDate}T10:00:00`,
              arriveAt: `${returnDate}T15:00:00`,
              durationMin: isLongHaul ? 900 : 200
            }]
          }
        ]
      });
    }
    return offers;
  }
}

export const flightProvider = new FlightProvider();
