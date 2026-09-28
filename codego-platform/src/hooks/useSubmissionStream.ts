import { useState, useEffect, useRef } from 'react';

export type SubmissionStatus = 'pending' | 'running' | 'completed' | 'error';

export interface SubmissionEvent {
  submissionId: string;
  status: SubmissionStatus;
  score?: number;
  passed?: boolean;
  testsPassed?: number;
  testsTotal?: number;
  degraded?: boolean;
}

/**
 * useSubmissionStream — replaces the 2-second setInterval polling.
 *
 * Opens an EventSource (SSE) connection to /api/submissions/:id/status/stream.
 * The backend emits exactly one terminal event (completed | error) then closes.
 * EventSource auto-reconnects on transient network errors — we only close it
 * explicitly when we receive a terminal event or the component unmounts.
 *
 * Fallback: if SSE fails to connect within FALLBACK_TIMEOUT_MS (e.g. behind
 * a corporate proxy that buffers chunked responses), we fall back to polling
 * the existing GET /api/submissions/:id/status endpoint at 2-second intervals.
 * This keeps parity with the old behaviour for restrictive environments.
 */

const FALLBACK_TIMEOUT_MS = 5000; // Switch to polling if SSE not connected in 5s

export function useSubmissionStream(
  submissionId: string | null,
  token: string | null,
) {
  const [event, setEvent] = useState<SubmissionEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!submissionId || !token) return;

    let settled = false;

    const resolve = (evt: SubmissionEvent) => {
      if (settled) return;
      settled = true;
      setEvent(evt);
      cleanup();
    };

    const cleanup = () => {
      esRef.current?.close();
      esRef.current = null;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
    };

    // ── Polling fallback (triggered if SSE stalls) ─────────────────────────
    const startPollingFallback = () => {
      if (pollRef.current) return; // already polling
      let attempts = 0;
      const MAX_ATTEMPTS = 600; // 600 × 2s = 20 min

      pollRef.current = setInterval(async () => {
        if (settled) { clearInterval(pollRef.current!); return; }
        attempts++;
        try {
          const res = await fetch(`/api/submissions/${submissionId}/status`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return;
          const data = await res.json();
          if (data.status === 'completed' || data.status === 'error' || attempts > MAX_ATTEMPTS) {
            resolve({ submissionId, ...data });
          }
        } catch { /* transient error — keep retrying */ }
      }, 2000);
    };

    // ── SSE primary path ──────────────────────────────────────────────────
    // EventSource doesn't support custom headers, so we pass the token via
    // a query param. The backend reads it from Authorization header OR ?token=
    // (add token query-param support to the SSE guard if needed, or use a
    // short-lived cookie — for now we fall back to polling which sends headers).
    //
    // IMPORTANT: for environments where EventSource + auth is not feasible,
    // the FALLBACK_TIMEOUT_MS guard automatically switches to polling.
    try {
      const es = new EventSource(
        `/api/submissions/${submissionId}/status/stream?token=${encodeURIComponent(token)}`,
      );
      esRef.current = es;

      // Set a fallback timer — if SSE doesn't open within 5s, use polling
      fallbackTimerRef.current = setTimeout(() => {
        if (!connected && !settled) {
          startPollingFallback();
        }
      }, FALLBACK_TIMEOUT_MS);

      es.onopen = () => {
        setConnected(true);
        // SSE connected — cancel the fallback timer
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
      };

      es.onmessage = (e) => {
        try {
          const data: SubmissionEvent = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          resolve(data);
        } catch { /* malformed event — ignore */ }
      };

      es.onerror = () => {
        // EventSource auto-retries; we only fall back to polling if we never connected
        if (!connected && !settled) {
          startPollingFallback();
        }
      };
    } catch {
      // EventSource not supported (should not happen in modern browsers)
      startPollingFallback();
    }

    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, token]);

  return { event, connected };
}
