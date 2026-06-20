/**
 * usePredictionJob
 *
 * React hook that implements the full async prediction flow:
 *   1. User calls submit(input)
 *   2. Hook creates a DB job → returns job_id immediately
 *   3. Hook subscribes to Supabase Realtime for push updates
 *   4. Polling fallback kicks in if Realtime is unavailable
 *   5. Hook exposes live status / result / error to the component
 *
 * Usage:
 *   const { submit, jobId, status, result, error, isLoading } = usePredictionJob();
 *
 *   // On form submit:
 *   await submit({ productName: 'Tomato', location: 'Delhi', quantity: '50 kg', … });
 *
 *   // Render:
 *   if (isLoading) return <Spinner />;
 *   if (status === 'completed') return <PredictionResult result={result} />;
 *   if (status === 'failed') return <ErrorMessage error={error} />;
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  predictionTaskService,
  PredictionJobInput,
  PredictionStatusResponse,
  PredictionJobRecord,
} from '@/services/predictionTaskService';
import type { PredictionStatus } from '@/integrations/supabase/types';
import type { PriceAnalysis } from '@/services/priceReasoningEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PredictionJobState {
  /** The UUID returned by createJob. Null until submit() is called. */
  jobId: string | null;

  /** Current lifecycle status of the prediction job */
  status: PredictionStatus | 'idle';

  /** Full prediction result — only present when status === 'completed' */
  result: PriceAnalysis | null;

  /** Confidence in [0, 1] — only present when status === 'completed' */
  confidence: number | null;

  /** Timestamp of completion in ISO format */
  completedAt: string | null;

  /** Error message — only present when status === 'failed' */
  error: string | null;

  /** True while a job is pending or processing */
  isLoading: boolean;

  /**
   * Submit a new prediction request.
   * Resolves immediately after the job is queued (does not wait for inference).
   */
  submit: (input: PredictionJobInput) => Promise<void>;

  /** Reset hook state to initial idle state */
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePredictionJob(): PredictionJobState {
  const [jobId, setJobId]         = useState<string | null>(null);
  const [status, setStatus]       = useState<PredictionStatus | 'idle'>('idle');
  const [result, setResult]       = useState<PriceAnalysis | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  // Ref to the Realtime unsubscribe function so we can clean up on unmount
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  /**
   * Apply a status response update to local state.
   */
  const applyStatusResponse = useCallback((resp: PredictionStatusResponse) => {
    setStatus(resp.status);

    switch (resp.status) {
      case 'completed':
        setResult(resp.prediction);
        setConfidence(resp.confidence);
        setCompletedAt(resp.timestamp);
        setError(null);
        break;
      case 'failed':
        setError(resp.error);
        setResult(null);
        break;
      case 'pending':
      case 'processing':
        // No extra data to extract
        break;
    }
  }, []);

  /**
   * Apply a raw DB record update (from Realtime subscription).
   */
  const applyRawRecord = useCallback(
    async (record: PredictionJobRecord) => {
      // Fetch the typed status response to normalise into component state
      try {
        const resp = await predictionTaskService.getJobStatus(record.job_id);
        applyStatusResponse(resp);
      } catch {
        setStatus(record.status);
      }
    },
    [applyStatusResponse],
  );

  /**
   * Submit a new prediction job.
   */
  const submit = useCallback(
    async (input: PredictionJobInput): Promise<void> => {
      // Tear down any existing subscription
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;

      // Reset state
      setJobId(null);
      setStatus('pending');
      setResult(null);
      setConfidence(null);
      setCompletedAt(null);
      setError(null);

      // Create job (DB write, returns immediately)
      const created = await predictionTaskService.createJob(input);
      setJobId(created.job_id);

      // Subscribe to Realtime push updates
      const unsub = predictionTaskService.subscribeToJob(
        created.job_id,
        applyRawRecord,
      );
      unsubscribeRef.current = unsub;

      // Kick off polling fallback in parallel (handles Realtime outages).
      // We intentionally don't await this — it resolves in background.
      predictionTaskService
        .pollUntilComplete(
          created.job_id,
          applyStatusResponse,
          60_000, // 60 s max wait
        )
        .then((final) => {
          applyStatusResponse(final);
          // Once terminal state reached, no more updates needed
          unsub();
          unsubscribeRef.current = null;
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.message.includes('did not complete within')) {
            setStatus('failed');
            setError('Prediction timed out. Please try again.');
          }
        });
    },
    [applyRawRecord, applyStatusResponse],
  );

  /**
   * Reset back to idle state.
   */
  const reset = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    setJobId(null);
    setStatus('idle');
    setResult(null);
    setConfidence(null);
    setCompletedAt(null);
    setError(null);
  }, []);

  const isLoading = status === 'pending' || status === 'processing';

  return {
    jobId,
    status,
    result,
    confidence,
    completedAt,
    error,
    isLoading,
    submit,
    reset,
  };
}
