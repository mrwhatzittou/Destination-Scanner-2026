
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plane, TrendingDown, TrendingUp, MapPin, Calendar, 
  ChevronRight, Filter, Settings, Info, ArrowLeft, 
  Bell, CheckCircle2, ExternalLink, Loader2, Ticket, 
  Zap, Tag, Clock, ShieldCheck, AlertCircle, X, Check,
  ThumbsUp, ThumbsDown, HelpCircle, Users, Plus, Minus, User, Eye, EyeOff,
  AlertTriangle, ShieldAlert, Copy, ClipboardCheck
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';

import { MonthRecommendation, TrackedQuery, Country, OfferCanonical, Passengers, MarketPricePoint, VerificationReport } from './types';
import { MONTH_NAMES, USD_TO_PHP, AIRLINES } from './constants';
import { flightProvider } from './services/flightProvider';
import { getTravelInsight } from './services/geminiService';
import { getGoogleFlightsUrl, getSearchDetailsSummary } from './utils/googleFlights';

// --- Utilities ---

const formatPHP = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount);
};

const getPassengerSummary = (p: Passengers) => {
  const parts = [];
  if (p.adults > 0) parts.push(`${p.adults} adult${p.adults > 1 ? 's' : ''}`);
  if (p.children > 0) parts.push(`${p.children} child${p.children > 1 ? 'ren' : ''}`);
  const infants = (p.infantsInSeat || 0) + (p.infantsOnLap || 0);
  if (infants > 0) parts.push(`${infants} infant${infants > 1 ? 's' : ''}`);
  return parts.join(', ');
};

const getAirlineName = (iata: string) => {
  const names: Record<string, string> = {
    'PR': 'Philippine Airlines',
    '5J': 'Cebu Pacific',
    'AK': 'AirAsia',
    'SQ': 'Singapore Airlines',
    'JL': 'Japan Airlines',
    'CX': 'Cathay Pacific',
    'BR': 'EVA Air',
    'KE': 'Korean Air',
    'QF': 'Qantas',
    'EK': 'Emirates'
  };
  return names[iata] || iata;
};

// --- Components ---

const PassengerSelector: React.FC<{
  passengers: Passengers;
  onChange: (p: Passengers) => void;
}> = ({ passengers, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const update = (key: keyof Passengers, delta: number) => {
    const newVal = Math.max(key === 'adults' ? 1 : 0, passengers[key] + delta);
    const p = { ...passengers, [key]: newVal };
    const total = p.adults + p.children + p.infantsInSeat + p.infantsOnLap;
    if (total <= 9) {
      onChange(p);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:bg-slate-50 p-2 rounded-xl transition-colors text-left"
      >
        <div className="bg-blue-50 p-1.5 rounded-lg">
          <Users className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Passengers</p>
          <p className="text-sm font-black text-slate-900 leading-none">{passengers.adults + passengers.children + passengers.infantsInSeat + passengers.infantsOnLap}</p>
        </div>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-4 left-0 w-64 bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 z-[100] animate-in slide-in-from-bottom-2 duration-200">
          <h4 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" /> Traveler Counts
          </h4>
          
          <div className="space-y-6">
            {(['adults', 'children', 'infantsInSeat', 'infantsOnLap'] as const).map((key) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-none capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => update(key, -1)} className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-400">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-4 text-center font-black text-slate-900 text-sm">{passengers[key]}</span>
                  <button onClick={() => update(key, 1)} className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-400">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MarketTrendChart: React.FC<{
  data: MarketPricePoint[];
  query: TrackedQuery;
  selectedMonth?: number;
}> = ({ data, query, selectedMonth }) => {
  const [visibleSeries, setVisibleSeries] = useState({
    cheapest: true,
    recommended: true,
    verified: true
  });

  const toggleSeries = (name: keyof typeof visibleSeries) => {
    setVisibleSeries(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-blue-600" /> Market Price Trend
        </h3>
        <div className="flex items-center gap-2">
           {['cheapest', 'recommended', 'verified'].map(s => (
             <button
               key={s}
               onClick={() => toggleSeries(s as any)}
               className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tight flex items-center gap-2 transition-all border ${
                 visibleSeries[s as keyof typeof visibleSeries] 
                 ? 'bg-white border-slate-200 text-slate-900 shadow-sm' 
                 : 'bg-slate-50 border-transparent text-slate-400 opacity-60'
               }`}
             >
               {s}
             </button>
           ))}
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} tickFormatter={(val) => `₱${val/1000}k`} width={40} />
            <Tooltip />
            {visibleSeries.cheapest && <Line type="monotone" dataKey="cheapest" stroke="#10b981" strokeWidth={3} dot={false} connectNulls={true} />}
            {visibleSeries.recommended && <Line type="monotone" dataKey="recommended" stroke="#2563eb" strokeWidth={3} dot={false} connectNulls={true} />}
            {visibleSeries.verified && <Line type="monotone" dataKey="verified" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={true} connectNulls={true} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-slate-400 font-medium text-center mt-4 italic">
        * Prices represent total for {getPassengerSummary(query.passengers)}
      </p>
    </div>
  );
};

/**
 * Enhanced Verification Dialog.
 * Fixes link reliability and forces strict date-matching confirmation.
 */
const VerifyDialog: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (report: Partial<VerificationReport>) => void;
  offer: OfferCanonical;
  type: 'CHEAPEST' | 'RECOMMENDED';
}> = ({ isOpen, onClose, onConfirm, offer, type }) => {
  const [step, setStep] = useState<'start' | 'check-prefill' | 'check-dates' | 'match-price' | 'failed-prefill'>('start');
  const [gfPrice, setGfPrice] = useState<string>("");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleOpenGF = () => {
    const url = getGoogleFlightsUrl(
      offer.originIata, 
      offer.destinationIata, 
      offer.departDate, 
      offer.returnDate, 
      offer.cabin, 
      offer.passengers,
      type === 'RECOMMENDED' ? offer.slices[0].segments[0].carrierIata : undefined
    );
    window.open(url, '_blank');
    if (step === 'start') setStep('check-prefill');
  };

  const handleCopyDetails = () => {
    const summary = getSearchDetailsSummary(
      offer.originIata,
      offer.destinationIata,
      offer.departDate,
      offer.returnDate,
      offer.cabin,
      offer.passengers,
      type === 'RECOMMENDED' ? getAirlineName(offer.slices[0].segments[0].carrierIata) : undefined
    );
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinalSubmit = (matches: boolean, seenPrice?: number) => {
    onConfirm({
      offerId: offer.id,
      offerType: type,
      originIata: offer.originIata,
      destinationIata: offer.destinationIata,
      departDate: offer.departDate,
      returnDate: offer.returnDate,
      cabin: offer.cabin,
      passengers: offer.passengers,
      appPricePhp: offer.price.totalPHP,
      gfPriceSeenPhp: seenPrice,
      gfSameDatesConfirmed: step === 'match-price',
      gfPrefillFailed: step === 'failed-prefill',
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Step: Start / Instructions */}
        {step === 'start' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="mb-6">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${type === 'CHEAPEST' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                {type === 'CHEAPEST' ? 'Verifying Lowest' : 'Verifying Recommended'}
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-2">Sync Verification</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">We'll attempt to pre-fill Google Flights with exact dates and route.</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itinerary</p>
                  <p className="font-black text-slate-900 text-lg">{offer.originIata} → {offer.destinationIata}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atlas Price</p>
                  <p className="font-black text-emerald-600 text-lg">{formatPHP(offer.price.totalPHP)}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
                 <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase">Depart</p>
                   <p className="text-xs font-bold text-slate-900">{offer.departDate}</p>
                 </div>
                 <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase">Return</p>
                   <p className="text-xs font-bold text-slate-900">{offer.returnDate || 'One Way'}</p>
                 </div>
              </div>
            </div>

            <button onClick={handleOpenGF} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]">
              <ExternalLink className="w-5 h-5" /> Open Google Flights
            </button>
            <button onClick={handleCopyDetails} className="w-full mt-3 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-xs py-2 transition-colors">
              {copied ? <ClipboardCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied Details' : 'Copy search details as fallback'}
            </button>
          </div>
        )}

        {/* Step: Prefill Success check */}
        {step === 'check-prefill' && (
          <div className="animate-in slide-in-from-right-4">
            <h3 className="text-xl font-black text-slate-900 mb-2">Did Google Flights load correctly?</h3>
            <p className="text-sm text-slate-500 mb-6">Did it pre-fill <strong>{offer.originIata} to {offer.destinationIata}</strong> for <strong>{offer.departDate}</strong>?</p>
            <div className="space-y-3">
              <button onClick={() => setStep('check-dates')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-black py-4 rounded-xl flex items-center justify-between px-6">
                Yes, it pre-filled correctly <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setStep('failed-prefill')} className="w-full bg-white border border-slate-200 text-slate-400 font-bold py-4 rounded-xl flex items-center justify-between px-6">
                No, it was blank or wrong origin <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step: Date match check */}
        {step === 'check-dates' && (
          <div className="animate-in slide-in-from-right-4">
            <h3 className="text-xl font-black text-slate-900 mb-2">Check exact dates</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Google Flights often opens a calendar. Make sure the search is set to exactly:
              <br/><span className="bg-slate-100 px-2 py-0.5 rounded text-slate-900 font-black inline-block mt-2">
                {offer.departDate} {offer.returnDate ? `— ${offer.returnDate}` : '(One Way)'}
              </span>
            </p>
            <div className="space-y-3">
              <button onClick={() => setStep('match-price')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl flex items-center justify-between px-6 shadow-lg shadow-blue-600/20">
                I am looking at these exact dates <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={handleOpenGF} className="w-full text-blue-600 font-bold text-sm py-4 rounded-xl border border-blue-100 flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4" /> Try re-opening link
              </button>
            </div>
          </div>
        )}

        {/* Step: Price match input */}
        {step === 'match-price' && (
          <div className="animate-in slide-in-from-right-4">
            <h3 className="text-xl font-black text-slate-900 mb-2">Price Match Result</h3>
            <p className="text-sm text-slate-500 mb-6">What total price do you see for {getPassengerSummary(offer.passengers)}?</p>
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₱</span>
              <input type="number" value={gfPrice} onChange={(e) => setGfPrice(e.target.value)} placeholder="Enter amount seen" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-4 pl-8 pr-4 font-black text-slate-900 focus:outline-none focus:border-blue-200" autoFocus />
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleFinalSubmit(true, Number(gfPrice))} className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95">
                Submit Result
              </button>
              <button onClick={() => setStep('check-dates')} className="px-6 text-slate-400 font-bold text-xs uppercase tracking-widest">Back</button>
            </div>
          </div>
        )}

        {/* Step: Handle Prefill Failure */}
        {step === 'failed-prefill' && (
          <div className="animate-in slide-in-from-right-4">
             <div className="bg-red-50 p-4 rounded-2xl flex items-start gap-3 mb-6">
               <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
               <div>
                 <p className="text-sm font-black text-red-900">Link Prefill Error</p>
                 <p className="text-xs text-red-600 font-medium">Google Flights didn't recognize our shortcut. Please copy the details below and enter them manually.</p>
               </div>
             </div>
             
             <div className="bg-slate-50 p-4 rounded-xl font-mono text-[10px] text-slate-600 whitespace-pre border border-slate-200 mb-6">
               {getSearchDetailsSummary(offer.originIata, offer.destinationIata, offer.departDate, offer.returnDate, offer.cabin, offer.passengers, type === 'RECOMMENDED' ? getAirlineName(offer.slices[0].segments[0].carrierIata) : undefined)}
             </div>

             <button onClick={handleCopyDetails} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl mb-3 flex items-center justify-center gap-2">
               {copied ? <ClipboardCheck className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
               {copied ? 'Copied to Clipboard' : 'Copy Search Details'}
             </button>
             <button onClick={() => handleFinalSubmit(false)} className="w-full text-slate-400 font-bold text-xs uppercase py-3 hover:text-slate-600">
               Close & Report Failure
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

const MonthCard: React.FC<{ 
  rec: MonthRecommendation; 
  onClick: () => void; 
  onVerify: (type: 'CHEAPEST' | 'RECOMMENDED') => void;
  passengers: Passengers;
}> = ({ rec, onClick, onVerify, passengers }) => {
  const isLowConfidence = rec.cheapest.validation.confidence === 'LOW';

  return (
    <div className="group bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full shadow-sm">
      <div className="flex justify-between items-start mb-4" onClick={onClick}>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
          {MONTH_NAMES[rec.month]}
        </span>
        <div className="flex flex-col items-end gap-1">
          {rec.isUserVerified ? (
            <div className="px-2 py-1 rounded-full flex items-center gap-1 text-[8px] font-black uppercase bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-3 h-3" /> User Confirmed
            </div>
          ) : isLowConfidence ? (
            <div className="px-2 py-1 rounded-full flex items-center gap-1 text-[8px] font-black uppercase bg-amber-50 text-amber-600 animate-pulse">
              <AlertTriangle className="w-3 h-3" /> Low Confidence
            </div>
          ) : (
            <div className="px-2 py-1 rounded-full flex items-center gap-1 text-[8px] font-black uppercase bg-slate-50 text-slate-400">
              <CheckCircle2 className="w-3 h-3" /> Data Validated
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3 mb-4" onClick={onClick}>
        <span className="text-4xl drop-shadow-sm select-none">{rec.country.flag}</span>
        <div className="min-w-0">
          <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors truncate">
            {rec.recommended.destinationIata} Hub
          </h3>
          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <MapPin className="w-3 h-3 text-blue-500" /> {rec.country.name}
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6 flex-grow" onClick={onClick}>
        <div className="bg-emerald-600/5 p-3 rounded-xl border border-emerald-100/30">
          <div className="flex justify-between items-center mb-1">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight flex items-center gap-1">
              <Tag className="w-2.5 h-2.5" /> Best Price ({getAirlineName(rec.cheapest.slices[0].segments[0].carrierIata)})
            </p>
            <p className="text-xs font-black text-slate-900">{formatPHP(rec.cheapest.price.totalPHP)}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-[9px] text-slate-400 font-medium">{rec.cheapest.departDate}</p>
            <button onClick={(e) => { e.stopPropagation(); onVerify('CHEAPEST'); }} className="text-[9px] font-black text-emerald-600 underline hover:text-emerald-800">Verify</button>
          </div>
        </div>

        <div className="bg-blue-600/5 p-3 rounded-xl border border-blue-100/50">
          <div className="flex justify-between items-center mb-1">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> Recommended
            </p>
            <p className="text-xs font-black text-blue-900">{formatPHP(rec.recommended.price.totalPHP)}</p>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
             <span className="truncate">{getAirlineName(rec.recommended.slices[0].segments[0].carrierIata)}</span>
             <button onClick={(e) => { e.stopPropagation(); onVerify('RECOMMENDED'); }} className="text-[9px] font-black text-blue-600 underline hover:text-blue-800">Verify</button>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-50 mt-auto" onClick={onClick}>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5 tracking-wider">Group Total</p>
            <p className="text-2xl font-black text-slate-900 leading-none tracking-tight">{formatPHP(rec.cheapest.price.totalPHP)}</p>
          </div>
          <div className="bg-slate-100 group-hover:bg-blue-600 p-2 rounded-lg transition-all">
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'month'>('home');
  const [selectedRec, setSelectedRec] = useState<MonthRecommendation | null>(null);
  const [recs, setRecs] = useState<MonthRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState("");
  const [verifyTarget, setVerifyTarget] = useState<{ rec: MonthRecommendation, type: 'CHEAPEST' | 'RECOMMENDED' } | null>(null);
  const [trendData, setTrendData] = useState<MarketPricePoint[]>([]);
  
  const [query, setQuery] = useState<TrackedQuery>({
    id: 'q-2026',
    origin: 'MNL',
    tripLengthNights: 7,
    cabin: 'ECONOMY',
    maxStops: 1,
    diversify: true,
    passengers: { adults: 1, children: 0, infantsInSeat: 0, infantsOnLap: 0 }
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await flightProvider.getMonthlyRecommendations(query);
      setRecs(data);
      setLoading(false);
    };
    fetchData();
  }, [query.origin, query.tripLengthNights, query.cabin, query.diversify, query.passengers]);

  const handleRecClick = async (rec: MonthRecommendation) => {
    setSelectedRec(rec);
    setView('month');
    setInsight("Analyzing destination signals...");
    const trend = await flightProvider.getYearlyTrend(query, rec.recommended.destinationIata);
    setTrendData(trend);
    const text = await getTravelInsight(rec.country.name, MONTH_NAMES[rec.month], rec.recommended.price.totalPHP, rec.recommended.slices[0].stopsCount);
    setInsight(text);
  };

  const handleVerifyConfirm = (report: Partial<VerificationReport>) => {
    if (verifyTarget) {
      setRecs(prev => prev.map(r => 
        r.month === verifyTarget.rec.month ? { 
          ...r, 
          isUserVerified: report.gfSameDatesConfirmed, 
          verifiedType: verifyTarget.type,
          verifiedPrice: report.gfPriceSeenPhp || r.verifiedPrice,
          verifiedAt: report.createdAt 
        } : r
      ));
    }
    setVerifyTarget(null);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-6">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <div className="text-center">
          <p className="text-xl font-black text-slate-900 tracking-tight">Syncing Canonical Offers</p>
          <p className="text-slate-400 font-bold text-sm italic">Quarantining outliers for data integrity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans selection:bg-blue-100">
      <header className="sticky top-0 z-50 glass border-b border-slate-200/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-xl shadow-xl shadow-slate-900/10">
            <Plane className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">DestinationScanner <span className="text-blue-600">2026</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <PassengerSelector passengers={query.passengers} onChange={(p) => setQuery(prev => ({ ...prev, passengers: p }))} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8">
        {view === 'home' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">2026 Destination Scanner</h2>
                <p className="text-slate-500 max-w-xl font-medium leading-relaxed">
                  Deep-linked results for <span className="text-slate-900 font-black underline decoration-blue-200 decoration-2">{query.origin} Origin</span>. 
                  Outliers are quarantined to ensure market integrity.
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
                 <ShieldCheck className="w-6 h-6 text-emerald-500" />
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Integrity Status</p>
                   <p className="text-sm font-bold text-slate-900 leading-none">Plausibility Filters Active</p>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recs.map((rec, idx) => (
                <MonthCard key={idx} rec={rec} onClick={() => handleRecClick(rec)} onVerify={(type) => setVerifyTarget({ rec, type })} passengers={query.passengers} />
              ))}
            </div>
          </div>
        )}

        {view === 'month' && selectedRec && (
          <div className="animate-in slide-in-from-bottom-6 duration-500">
            <button onClick={() => setView('home')} className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-xs transition-all group">
              <div className="bg-white p-2 rounded-xl border border-slate-200 group-hover:border-slate-900 shadow-sm transition-all"><ArrowLeft className="w-4 h-4" /></div>
              Return to 2026 Destination Scanner
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm relative overflow-hidden">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 relative">
                    <div className="flex items-center gap-6">
                      <span className="text-8xl drop-shadow-xl select-none">{selectedRec.country.flag}</span>
                      <div>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-1">
                          {getAirlineName(selectedRec.recommended.slices[0].segments[0].carrierIata)}
                        </h2>
                        <p className="text-lg font-bold text-slate-400">{selectedRec.country.name} • {selectedRec.recommended.destinationIata}</p>
                      </div>
                    </div>
                    <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl min-w-[200px] shadow-slate-900/20">
                      <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-1">Recommended Total</p>
                      <p className="text-4xl font-black tracking-tight">{formatPHP(selectedRec.recommended.price.totalPHP)}</p>
                    </div>
                  </div>

                  <div className="bg-blue-600 text-white rounded-3xl p-8 mb-10 shadow-xl shadow-blue-600/10">
                    <h4 className="text-lg font-black mb-4 flex items-center gap-2 relative"><Zap className="w-6 h-6" /> Dest. Insight</h4>
                    <p className="text-xl font-medium leading-relaxed italic opacity-90">"{insight}"</p>
                  </div>

                  <MarketTrendChart data={trendData} query={query} selectedMonth={selectedRec.month} />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden shadow-slate-900/20">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-3 relative"><ExternalLink className="w-6 h-6 text-blue-400" /> Verify on GF</h3>
                  <div className="space-y-4 relative">
                    <button onClick={() => setVerifyTarget({ rec: selectedRec, type: 'CHEAPEST' })} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-900/40 transition-all active:scale-[0.98]">Verify Lowest</button>
                    <button onClick={() => setVerifyTarget({ rec: selectedRec, type: 'RECOMMENDED' })} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/40 transition-all active:scale-[0.98]">Verify Recommended</button>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                   <h4 className="text-sm font-black text-slate-900 mb-4 tracking-widest uppercase flex items-center gap-2">
                     <ShieldCheck className="w-4 h-4 text-emerald-500" /> Integrity Guard
                   </h4>
                   <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                     "We derive search parameters strictly from validated offer IDs to prevent origin leakage. Verification reports are reviewed daily."
                   </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {verifyTarget && (
        <VerifyDialog 
          isOpen={true} 
          onClose={() => setVerifyTarget(null)} 
          onConfirm={handleVerifyConfirm}
          offer={verifyTarget.type === 'CHEAPEST' ? verifyTarget.rec.cheapest : verifyTarget.rec.recommended}
          type={verifyTarget.type}
        />
      )}
    </div>
  );
};

export default App;
