/**
 * Price Reasoning Engine
 *
 * Pure inference module — no UI coupling, no side effects.
 * Used by:
 *  - predictionTaskService.ts  (simulated worker, browser)
 *  - supabase/functions/prediction-worker/index.ts  (Edge Function worker)
 *
 * Architectural decision: extracting inference into its own file means
 * the API layer (aiService.ts) can create jobs and return immediately
 * without ever importing this module. This enforces the boundary that
 * API threads never run inference.
 */

import { mandiPriceService, PriceSummary } from './mandiPriceService';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface PriceRange {
  low: number;
  average: number;
  high: number;
}

export interface PriceAnalysis {
  priceRange: PriceRange;
  explanation: string;
  counterOffer: string;
  /** Confidence score in [0, 1] — always present, never undefined */
  confidence: number;
  dataSource: 'live' | 'fallback';
}

export interface InferenceInput {
  productName: string;
  location: string;
  quantity: string;
  vendorLanguage?: string;
  buyerMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Location multipliers
// ─────────────────────────────────────────────────────────────────────────────

const LOCATION_MULTIPLIERS: Record<string, number> = {
  delhi: 1.2,
  mumbai: 1.3,
  bangalore: 1.15,
  chennai: 1.1,
  kolkata: 1.05,
  hyderabad: 1.1,
  pune: 1.15,
  jaipur: 1.0,
  lucknow: 0.95,
  kanpur: 0.9,
  nagpur: 0.95,
  indore: 0.95,
  default: 0.85,
};

// ─────────────────────────────────────────────────────────────────────────────
// Product database (fallback when live AGMARKNET data is unavailable)
// ─────────────────────────────────────────────────────────────────────────────

interface ProductSpec {
  base: number;
  seasonal: number;
  volatility: number;
}

const INDIAN_PRODUCTS_DB: Record<string, ProductSpec> = {
  tomato:      { base: 25,  seasonal: 0.2,  volatility: 0.3  },
  onion:       { base: 30,  seasonal: 0.15, volatility: 0.25 },
  potato:      { base: 20,  seasonal: 0.1,  volatility: 0.2  },
  cabbage:     { base: 15,  seasonal: 0.25, volatility: 0.2  },
  cauliflower: { base: 35,  seasonal: 0.3,  volatility: 0.25 },
  carrot:      { base: 40,  seasonal: 0.2,  volatility: 0.2  },
  beans:       { base: 60,  seasonal: 0.2,  volatility: 0.3  },
  peas:        { base: 80,  seasonal: 0.4,  volatility: 0.3  },
  spinach:     { base: 25,  seasonal: 0.3,  volatility: 0.25 },
  okra:        { base: 45,  seasonal: 0.25, volatility: 0.3  },
  apple:       { base: 120, seasonal: 0.15, volatility: 0.2  },
  banana:      { base: 40,  seasonal: 0.1,  volatility: 0.15 },
  orange:      { base: 60,  seasonal: 0.2,  volatility: 0.2  },
  mango:       { base: 80,  seasonal: 0.5,  volatility: 0.4  },
  grapes:      { base: 100, seasonal: 0.3,  volatility: 0.25 },
  rice:        { base: 45,  seasonal: 0.1,  volatility: 0.15 },
  wheat:       { base: 25,  seasonal: 0.1,  volatility: 0.15 },
  dal:         { base: 80,  seasonal: 0.2,  volatility: 0.25 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper utilities
// ─────────────────────────────────────────────────────────────────────────────

function getLocationMultiplier(location: string): number {
  const normalized = location.toLowerCase().trim();
  for (const [city, multiplier] of Object.entries(LOCATION_MULTIPLIERS)) {
    if (normalized.includes(city)) return multiplier;
  }
  return LOCATION_MULTIPLIERS.default;
}

function getSeasonalFactor(): number {
  const factors = [0.1, 0.05, -0.05, -0.1, 0.15, 0.2, 0.1, 0.05, -0.05, -0.1, 0.0, 0.05];
  return factors[new Date().getMonth()];
}

function getQuantityFactor(quantity: string): number {
  const match = quantity.match(/(\d+)/);
  const n = match ? parseInt(match[1]) : 1;
  if (n >= 100) return 0.95;
  if (n >= 50)  return 0.97;
  if (n >= 20)  return 0.99;
  return 1.0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Live data path
// ─────────────────────────────────────────────────────────────────────────────

function buildLiveAnalysis(priceSummary: PriceSummary, quantity: string): PriceAnalysis {
  const qFactor = getQuantityFactor(quantity);
  const sFactor = getSeasonalFactor();

  const priceRange: PriceRange = {
    low:     Math.round(priceSummary.priceRange.min * qFactor),
    average: Math.round(priceSummary.priceRange.average * qFactor * (1 + sFactor)),
    high:    Math.round(priceSummary.priceRange.max * qFactor),
  };

  const { commodity, region, marketCount, confidence: dq } = priceSummary;
  const qualityLabel = dq === 'high' ? 'विश्वसनीय' : dq === 'medium' ? 'अच्छा' : 'सामान्य';
  const discountNote = qFactor < 1 ? ' थोक छूट के साथ' : '';
  const seasonNote   = sFactor > 0.1 ? ' मौसमी मांग के कारण' : sFactor < -0.1 ? ' अच्छी सप्लाई के कारण' : '';

  const explanations = [
    `${region} में ${commodity} का ${qualityLabel} डेटा ${marketCount} मंडियों से मिला है। आज का भाव ₹${priceRange.average} प्रति किलो${discountNote}${seasonNote}।`,
    `सरकारी डेटा के अनुसार ${commodity} की कीमत ${region} में ₹${priceRange.low} से ₹${priceRange.high} तक है।`,
    `AGMARKNET के अनुसार ${commodity} का ताजा भाव ${region} में ₹${priceRange.average} प्रति किलो है।`,
  ];

  const targetPrice = Math.round((priceRange.average + priceRange.high) / 2);
  const qualityAssurance = dq === 'high' ? 'सबसे अच्छी क्वालिटी का' : 'अच्छी क्वालिटी का';
  const counterOffers = [
    `साहब, सरकारी डेटा के अनुसार यह ${commodity} ${qualityAssurance} है। ₹${targetPrice} प्रति किलो से कम नहीं हो सकता।`,
    `भाई, मंडी भाव ₹${priceRange.average} चल रहा है। मैं ₹${targetPrice} में दे रहा हूं।`,
    `${marketCount} मंडियों का औसत भाव ₹${priceRange.average} है। ₹${targetPrice} अंतिम रेट है।`,
  ];

  // Confidence: base 0.7 + data quality bonus
  let confidence = 0.7;
  if (marketCount >= 15)      confidence += 0.2;
  else if (marketCount >= 8)  confidence += 0.1;
  if (dq === 'high')          confidence += 0.1;
  else if (dq === 'low')      confidence -= 0.1;

  return {
    priceRange,
    explanation: explanations[Math.floor(Math.random() * explanations.length)],
    counterOffer: counterOffers[Math.floor(Math.random() * counterOffers.length)],
    confidence: Math.min(0.95, Math.max(0.5, confidence)),
    dataSource: 'live',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback rule-based path
// ─────────────────────────────────────────────────────────────────────────────

function buildFallbackAnalysis(productName: string, location: string, quantity: string): PriceAnalysis {
  const key = productName.toLowerCase().trim();
  const spec = INDIAN_PRODUCTS_DB[key] ?? INDIAN_PRODUCTS_DB['tomato'];
  const locMult  = getLocationMultiplier(location);
  const sFactor  = getSeasonalFactor();
  const jitter   = (Math.random() - 0.5) * 2 * spec.volatility;
  const base     = spec.base * locMult * (1 + sFactor) * (1 + jitter);
  const qFactor  = getQuantityFactor(quantity);

  const priceRange: PriceRange = {
    low:     Math.round(base * 0.85 * qFactor),
    average: Math.round(base * qFactor),
    high:    Math.round(base * 1.15 * qFactor),
  };

  const targetPrice = Math.round((priceRange.average + priceRange.high) / 2);
  const confidence  = INDIAN_PRODUCTS_DB[key] ? 0.65 : 0.45;

  return {
    priceRange,
    explanation: `आज ${productName} की मांग अच्छी है। ${location} में औसत भाव ₹${priceRange.average} प्रति किलो चल रहा है।`,
    counterOffer: `साहब, यह ${productName} बहुत अच्छी क्वालिटी का है। ₹${targetPrice} प्रति किलो से कम नहीं हो सकता।`,
    confidence,
    dataSource: 'fallback',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run price inference for a given product/location/quantity.
 *
 * Tries live AGMARKNET data first; falls back to the rule-based engine.
 * Always returns a valid PriceAnalysis with a non-null confidence score.
 *
 * This function is the ONLY place inference is permitted to run.
 * It must never be called from an API request handler.
 */
export async function runPriceInference(input: InferenceInput): Promise<PriceAnalysis> {
  const { productName, location, quantity } = input;

  try {
    const priceSummary = await mandiPriceService.getPriceSummary(productName, location);
    return buildLiveAnalysis(priceSummary, quantity);
  } catch (err) {
    console.warn('[PriceReasoningEngine] Live data unavailable, using fallback:', err);
    return buildFallbackAnalysis(productName, location, quantity);
  }
}

/**
 * Synchronous fallback — only for use in environments where
 * the AGMARKNET API is not accessible (e.g. unit tests without mocks).
 */
export function runPriceInferenceSync(input: InferenceInput): PriceAnalysis {
  return buildFallbackAnalysis(input.productName, input.location, input.quantity);
}
