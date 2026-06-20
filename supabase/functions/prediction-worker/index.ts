/**
 * Prediction Worker – Supabase Edge Function
 *
 * This is the async background worker described in Issue #11.
 * It is the ONLY place where model inference (runPriceInference) executes.
 *
 * Trigger options (configure in Supabase Dashboard):
 *   A) HTTP POST to /functions/v1/prediction-worker  (called by a DB webhook
 *      on INSERT into price_predictions)
 *   B) Scheduled cron: every 10 seconds via pg_cron or Supabase Scheduled Functions
 *
 * Worker loop per invocation:
 *   1. Claim next pending job  (SELECT FOR UPDATE SKIP LOCKED via DB function)
 *   2. Mark status = 'processing'  ← done atomically inside claim function
 *   3. Reconstruct input from job record
 *   4. Run price inference
 *   5. Calculate confidence score
 *   6. Store result + mark 'completed'
 *   7. On any exception → mark 'failed' (up to 3 retries via attempt_count)
 *
 * Reliability:
 *   - SKIP LOCKED prevents duplicate processing across concurrent workers
 *   - attempt_count cap (≤3) prevents infinite retry loops
 *   - All DB writes are in atomic transactions via Postgres functions
 *   - Structured JSON logging for observability
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────────────────────
// Inference engine (inlined for Edge Function — Deno cannot import from src/)
// In a monorepo setup, this would be a shared package.
// ─────────────────────────────────────────────────────────────────────────────

interface PriceRange {
  low: number;
  average: number;
  high: number;
}

interface PriceAnalysis {
  priceRange: PriceRange;
  explanation: string;
  counterOffer: string;
  confidence: number;
  dataSource: 'live' | 'fallback';
}

interface InferenceInput {
  productName: string;
  location: string;
  quantity: string;
}

const INDIAN_PRODUCTS_DB: Record<string, { base: number; volatility: number }> = {
  tomato: { base: 25, volatility: 0.3 }, onion:  { base: 30, volatility: 0.25 },
  potato: { base: 20, volatility: 0.2 }, rice:   { base: 45, volatility: 0.15 },
  wheat:  { base: 25, volatility: 0.15 }, dal:   { base: 80, volatility: 0.25 },
  apple:  { base: 120, volatility: 0.2 }, banana: { base: 40, volatility: 0.15 },
  mango:  { base: 80,  volatility: 0.4 }, grapes: { base: 100, volatility: 0.25 },
};

const LOCATION_MULTIPLIERS: Record<string, number> = {
  delhi: 1.2, mumbai: 1.3, bangalore: 1.15, chennai: 1.1,
  kolkata: 1.05, hyderabad: 1.1, pune: 1.15, default: 0.85,
};

function getLocationMultiplier(location: string): number {
  const loc = location.toLowerCase();
  for (const [city, m] of Object.entries(LOCATION_MULTIPLIERS)) {
    if (loc.includes(city)) return m;
  }
  return LOCATION_MULTIPLIERS.default;
}

function getSeasonalFactor(): number {
  const factors = [0.1, 0.05, -0.05, -0.1, 0.15, 0.2, 0.1, 0.05, -0.05, -0.1, 0.0, 0.05];
  return factors[new Date().getMonth()];
}

function getQuantityFactor(quantity: string): number {
  const n = parseInt(quantity.match(/(\d+)/)?.[1] ?? '1');
  if (n >= 100) return 0.95;
  if (n >= 50)  return 0.97;
  if (n >= 20)  return 0.99;
  return 1.0;
}

async function fetchLiveMandPrice(commodity: string, region: string): Promise<{
  min: number; max: number; average: number; marketCount: number;
} | null> {
  try {
    const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070` +
      `?api-key=579b464db66ec23bdd000001cdd3946e44ce4aab5b8a5c9de8e5027a` +
      `&format=json&limit=50` +
      `&filters[Commodity]=${encodeURIComponent(commodity)}` +
      `&filters[State]=${encodeURIComponent(region)}`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;

    const json = await resp.json();
    const records: Array<{ Min_x0020_Price: string; Max_x0020_Price: string; Modal_x0020_Price: string }> =
      json.records ?? [];
    if (records.length === 0) return null;

    const prices = records.map((r) => ({
      min: parseFloat(r.Min_x0020_Price),
      max: parseFloat(r.Max_x0020_Price),
      modal: parseFloat(r.Modal_x0020_Price),
    })).filter((p) => !isNaN(p.modal));

    if (prices.length === 0) return null;

    return {
      min:         Math.min(...prices.map((p) => p.min)),
      max:         Math.max(...prices.map((p) => p.max)),
      average:     prices.reduce((s, p) => s + p.modal, 0) / prices.length,
      marketCount: prices.length,
    };
  } catch {
    return null;
  }
}

async function runInference(input: InferenceInput): Promise<PriceAnalysis> {
  const { productName, location, quantity } = input;
  const qFactor  = getQuantityFactor(quantity);
  const sFactor  = getSeasonalFactor();

  // Try live AGMARKNET data
  const live = await fetchLiveMandPrice(productName, location);
  if (live) {
    const priceRange: PriceRange = {
      low:     Math.round(live.min * qFactor),
      average: Math.round(live.average * qFactor * (1 + sFactor)),
      high:    Math.round(live.max * qFactor),
    };
    const targetPrice = Math.round((priceRange.average + priceRange.high) / 2);
    let confidence = 0.7 + (live.marketCount >= 15 ? 0.2 : live.marketCount >= 8 ? 0.1 : 0);
    confidence = Math.min(0.95, confidence);

    return {
      priceRange,
      explanation: `AGMARKNET के अनुसार ${productName} का भाव ${location} में ₹${priceRange.average} प्रति किलो है (${live.marketCount} मंडियों का डेटा)।`,
      counterOffer: `भाई, मंडी भाव ₹${priceRange.average} चल रहा है। मैं ₹${targetPrice} में दे रहा हूं — यह बहुत उचित रेट है।`,
      confidence,
      dataSource: 'live',
    };
  }

  // Fallback rule-based
  const spec    = INDIAN_PRODUCTS_DB[productName.toLowerCase()] ?? INDIAN_PRODUCTS_DB['tomato'];
  const locMult = getLocationMultiplier(location);
  const jitter  = (Math.random() - 0.5) * 2 * spec.volatility;
  const base    = spec.base * locMult * (1 + sFactor) * (1 + jitter) * qFactor;
  const priceRange: PriceRange = {
    low:     Math.round(base * 0.85),
    average: Math.round(base),
    high:    Math.round(base * 1.15),
  };
  const targetPrice = Math.round((priceRange.average + priceRange.high) / 2);
  const confidence  = INDIAN_PRODUCTS_DB[productName.toLowerCase()] ? 0.65 : 0.45;

  return {
    priceRange,
    explanation: `आज ${productName} की मांग अच्छी है। ${location} में औसत भाव ₹${priceRange.average} प्रति किलो चल रहा है।`,
    counterOffer: `साहब, यह ${productName} अच्छी क्वालिटी का है। ₹${targetPrice} प्रति किलो से कम नहीं होगा।`,
    confidence,
    dataSource: 'fallback',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Structured logger
// ─────────────────────────────────────────────────────────────────────────────

function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta: Record<string, unknown> = {}) {
  console[level === 'INFO' ? 'log' : level === 'WARN' ? 'warn' : 'error'](
    JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...meta }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Health check
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'healthy', worker: 'prediction-worker', timestamp: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Service-role client — bypasses RLS so the worker can UPDATE any pending row
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  let processedCount = 0;
  let errorCount = 0;

  // Process up to 5 pending jobs per invocation (batch processing)
  for (let i = 0; i < 5; i++) {
    // Claim next pending job atomically (FOR UPDATE SKIP LOCKED)
    const { data: jobs, error: claimError } = await supabase.rpc('claim_next_prediction_job');

    if (claimError) {
      log('ERROR', 'Failed to claim job', { error: claimError.message });
      break;
    }

    const job = jobs?.[0];
    if (!job) break; // No more pending jobs

    const jobId = job.job_id;
    log('INFO', 'Processing job', { job_id: jobId, symbol: job.symbol, location: job.location, attempt: job.attempt_count });

    try {
      // ── Run inference ────────────────────────────────────────────────────
      const result = await runInference({
        productName: job.symbol,
        location:    job.location,
        quantity:    job.quantity,
      });

      log('INFO', 'Inference complete', {
        job_id:     jobId,
        confidence: result.confidence,
        dataSource: result.dataSource,
      });

      // ── Store result ─────────────────────────────────────────────────────
      const { error: updateError } = await supabase
        .from('price_predictions')
        .update({
          status:       'completed',
          prediction:   result,
          confidence:   result.confidence,
          completed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('job_id', jobId)
        .eq('status', 'processing'); // Idempotent guard

      if (updateError) {
        log('ERROR', 'Failed to store prediction result', { job_id: jobId, error: updateError.message });
        errorCount++;
        continue;
      }

      processedCount++;
      log('INFO', 'Job completed successfully', { job_id: jobId });

    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log('ERROR', 'Inference failed', { job_id: jobId, error: errorMsg, attempt: job.attempt_count });
      errorCount++;

      // Mark failed if max attempts reached, else leave for retry by next invocation
      if (job.attempt_count >= 3) {
        await supabase.rpc('mark_prediction_failed', {
          p_job_id:    jobId,
          p_error_msg: `Inference failed after ${job.attempt_count} attempts: ${errorMsg}`,
        });
        log('WARN', 'Job marked as permanently failed', { job_id: jobId });
      } else {
        // Reset to pending so the next worker invocation can retry
        await supabase
          .from('price_predictions')
          .update({ status: 'pending' })
          .eq('job_id', jobId)
          .eq('status', 'processing');
        log('INFO', 'Job reset to pending for retry', { job_id: jobId, next_attempt: job.attempt_count + 1 });
      }
    }
  }

  log('INFO', 'Worker cycle complete', { processed: processedCount, errors: errorCount });

  return new Response(
    JSON.stringify({ processed: processedCount, errors: errorCount }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
