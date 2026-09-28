import { useEffect, useRef, useCallback } from 'react';
import type * as Monaco from 'monaco-editor';

/**
 * useKeystrokeTelemetry — captures Monaco editor interaction signals for:
 *   Feature 1: Keystroke Dynamics & Code DNA (originality scoring)
 *   Feature 3: Time-Travel Keystroke Playback (delta storage for faculty)
 *
 * Privacy design:
 *   - No raw keystroke content is ever sent over the wire.
 *   - Feature 1 only transmits timing statistics (mean, stdDev, counts).
 *   - Feature 3 transmits Monaco IModelContentChange deltas (the same data
 *     VS Code uses for undo/redo) — this IS the code text, but only batched
 *     and associated with the student's own submissionId (not broadcast).
 *
 * Captures from editor mount onwards. If submissionId is not yet created
 * (e.g. student is typing before submit), data is buffered in-memory and
 * flushed automatically when submissionId becomes available or via flush().
 */

const WINDOW_MS = 2500;
const MAX_BATCH_DELTAS = 100;

interface FeatureVector {
  meanInterKeyMs: number;
  stdDevInterKeyMs: number;
  pastedCharCount: number;
  typedCharCount: number;
  maxSingleInsertionLength: number;
  burstCount: number;
}

export function useKeystrokeTelemetry(
  editor: Monaco.editor.IStandaloneCodeEditor | null,
  submissionId: string | null,
  token: string | null,
) {
  const keyTimestamps = useRef<number[]>([]);
  const pastedChars = useRef(0);
  const typedChars = useRef(0);
  const maxInsertion = useRef(0);
  const windowIndex = useRef(0);

  // Buffered data awaiting flush
  const pendingWindows = useRef<{ windowIndex: number; featureVector: FeatureVector }[]>([]);
  const pendingDeltas = useRef<any[]>([]);
  const deltaSeqNum = useRef(0);
  const sessionStart = useRef(performance.now());

  const subIdRef = useRef<string | null>(submissionId);
  const tokenRef = useRef<string | null>(token);

  useEffect(() => {
    subIdRef.current = submissionId;
    tokenRef.current = token;
  }, [submissionId, token]);

  const sendPayload = async (subId: string, tok: string, path: string, body: unknown) => {
    try {
      await fetch(`/api/submissions/${subId}/telemetry${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tok}`,
        },
        body: JSON.stringify(body),
      });
    } catch {
      // Non-fatal
    }
  };

  const flush = useCallback(async (explicitSubId?: string, explicitToken?: string) => {
    const targetSubId = explicitSubId || subIdRef.current;
    const targetToken = explicitToken || tokenRef.current || localStorage.getItem('token');

    if (!targetSubId || !targetToken) return;

    // Flush pending windows
    if (pendingWindows.current.length > 0) {
      const windowsToSend = [...pendingWindows.current];
      pendingWindows.current = [];
      for (const w of windowsToSend) {
        await sendPayload(targetSubId, targetToken, '', w);
      }
    }

    // Flush pending deltas in batches
    if (pendingDeltas.current.length > 0) {
      const deltasToSend = [...pendingDeltas.current];
      pendingDeltas.current = [];
      while (deltasToSend.length > 0) {
        const batch = deltasToSend.splice(0, MAX_BATCH_DELTAS);
        await sendPayload(targetSubId, targetToken, '/deltas', { deltas: batch });
      }
    }
  }, []);

  // When submissionId transitions from null to valid, trigger flush
  useEffect(() => {
    if (submissionId && token) {
      flush(submissionId, token);
    }
  }, [submissionId, token, flush]);

  useEffect(() => {
    if (!editor) return;

    sessionStart.current = performance.now();

    // ── Feature 1: inter-keystroke timing ───────────────────────────────
    const keyDisposable = editor.onKeyDown(() => {
      keyTimestamps.current.push(performance.now());
    });

    // ── Feature 1 + 3: content change listener ──────────────────────────
    const contentDisposable = editor.onDidChangeModelContent((e) => {
      for (const change of e.changes) {
        const len = change.text.length;

        // Feature 1: classify as paste-like or typed
        if (!e.isFlush) {
          maxInsertion.current = Math.max(maxInsertion.current, len);
          if (len > 1) {
            pastedChars.current += len;
          } else if (len === 1) {
            typedChars.current += 1;
          }
        }

        // Feature 3: buffer the Monaco delta
        if (!e.isFlush) {
          const delta = {
            sequenceNum: deltaSeqNum.current++,
            range: change.range,
            text: change.text,
            rangeLength: change.rangeLength,
            timestampMs: Math.round(performance.now() - sessionStart.current),
          };

          pendingDeltas.current.push(delta);

          // If submissionId is already known and buffer is large, flush deltas directly
          const activeSubId = subIdRef.current;
          const activeToken = tokenRef.current;
          if (activeSubId && activeToken && pendingDeltas.current.length >= MAX_BATCH_DELTAS) {
            const batch = pendingDeltas.current.splice(0, MAX_BATCH_DELTAS);
            sendPayload(activeSubId, activeToken, '/deltas', { deltas: batch });
          }
        }
      }
    });

    // ── Periodic window aggregator ──────────────────────────────────────
    const interval = setInterval(() => {
      const deltas = computeInterKeyDeltas(keyTimestamps.current);
      const fv: FeatureVector = {
        meanInterKeyMs: mean(deltas),
        stdDevInterKeyMs: stdDev(deltas),
        pastedCharCount: pastedChars.current,
        typedCharCount: typedChars.current,
        maxSingleInsertionLength: maxInsertion.current,
        burstCount: countBursts(deltas),
      };

      if (fv.typedCharCount + fv.pastedCharCount > 0) {
        const windowPayload = { windowIndex: windowIndex.current++, featureVector: fv };
        const activeSubId = subIdRef.current;
        const activeToken = tokenRef.current;
        if (activeSubId && activeToken) {
          sendPayload(activeSubId, activeToken, '', windowPayload);
        } else {
          pendingWindows.current.push(windowPayload);
        }
      }

      // Reset accumulators
      keyTimestamps.current = [];
      pastedChars.current = 0;
      typedChars.current = 0;
      maxInsertion.current = 0;

      // Also flush pending deltas if active
      const activeSubId = subIdRef.current;
      const activeToken = tokenRef.current;
      if (activeSubId && activeToken && pendingDeltas.current.length > 0) {
        const batch = [...pendingDeltas.current];
        pendingDeltas.current = [];
        sendPayload(activeSubId, activeToken, '/deltas', { deltas: batch });
      }
    }, WINDOW_MS);

    return () => {
      keyDisposable.dispose();
      contentDisposable.dispose();
      clearInterval(interval);
    };
  }, [editor]);

  return { flush };
}

// ── Math helpers ────────────────────────────────────────────────────────────
function computeInterKeyDeltas(ts: number[]): number[] {
  const deltas: number[] = [];
  for (let i = 1; i < ts.length; i++) deltas.push(ts[i] - ts[i - 1]);
  return deltas;
}

function mean(a: number[]): number {
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
}

function stdDev(a: number[]): number {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map((v) => (v - m) ** 2)));
}

function countBursts(deltas: number[]): number {
  let bursts = 0;
  let run = 0;
  for (const d of deltas) {
    if (d < 50) {
      run++;
    } else {
      if (run >= 6) bursts++;
      run = 0;
    }
  }
  if (run >= 6) bursts++;
  return bursts;
}
