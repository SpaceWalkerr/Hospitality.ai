"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CaseContext,
  HospitalMatch,
  JourneyStage,
  NormalizedPolicy,
  PolicySummaryPoint,
  SourceDoc,
  StageGuidance,
  StreamEvent,
} from "@/lib/types";

/**
 * Session state.
 *
 * Held in React context and mirrored into sessionStorage so that moving
 * between screens — or an accidental refresh in a waiting room — does not
 * throw away a parse that took real time and real tokens. Nothing is sent
 * anywhere except to this app's own route handlers.
 */

const KEY = "hospitality.session.v1";

export type Chosen = { hospitalId: string; roomCategory: string } | null;

type Session = {
  source: SourceDoc | null;
  /** Set when the source is one of the bundled samples; drives Demo Mode. */
  sampleId: string | null;
  policy: NormalizedPolicy | null;
  points: PolicySummaryPoint[];
  brief: string;
  ctx: CaseContext;
  matches: HospitalMatch[];
  comparison: string;
  chosen: Chosen;
  stage: JourneyStage;
  guidance: Partial<Record<JourneyStage, StageGuidance>>;
  visited: JourneyStage[];
};

const EMPTY: Session = {
  source: null,
  sampleId: null,
  policy: null,
  points: [],
  brief: "",
  ctx: {
    condition: "Angioplasty (single stent)",
    localityId: "jayanagar",
    expectedDays: 4,
    procedureCost: 250000,
    urgency: "emergency",
  },
  matches: [],
  comparison: "",
  chosen: null,
  stage: "admission",
  guidance: {},
  visited: ["admission"],
};

type Patch = Partial<Session> | ((prev: Session) => Partial<Session>);

type Ctx = {
  session: Session;
  update: (patch: Patch) => void;
  reset: () => void;
  hydrated: boolean;
  config: { demo: boolean; model: string | null } | null;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [config, setConfig] = useState<Ctx["config"]>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setSession({ ...EMPTY, ...JSON.parse(raw) });
    } catch {
      /* a corrupt session is not worth crashing over */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    let live = true;
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => live && setConfig(c))
      .catch(() => live && setConfig({ demo: true, model: null }));
    return () => {
      live = false;
    };
  }, []);

  const update = useCallback((patch: Patch) => {
    setSession((prev) => {
      const next = {
        ...prev,
        ...(typeof patch === "function" ? patch(prev) : patch),
      };
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* quota or private mode — state still works for this page */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* nothing to clear */
    }
    setSession(EMPTY);
  }, []);

  const value = useMemo(
    () => ({ session, update, reset, hydrated, config }),
    [session, update, reset, hydrated, config],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/* ---------------- NDJSON stream consumption ---------------- */

export type StreamState = {
  running: boolean;
  status: { label: string; step: number; of: number } | null;
  error: string | null;
};

/**
 * Reads an NDJSON response and dispatches each event.
 *
 * Deltas are flushed on animation frames rather than per token: a token-per-
 * render loop makes long streams stutter, and the whole point of this screen
 * is that it should feel calm.
 */
export function useNdjson() {
  const [state, setState] = useState<StreamState>({
    running: false,
    status: null,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (
      url: string,
      body: unknown,
      handlers: {
        onEvent?: (e: StreamEvent) => void;
        onDelta?: (full: string) => void;
      },
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ running: true, status: null, error: null });

      let buffered = "";
      let frame: number | null = null;
      const flush = () => {
        frame = null;
        handlers.onDelta?.(buffered);
      };

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          // Routes and the rate limiter return { error } with a message
          // written for people; prefer it over a bare status code.
          let message = `Request failed (${res.status}).`;
          try {
            const data = (await res.json()) as { error?: string };
            if (data?.error) message = data.error;
          } catch {
            /* not JSON — keep the status message */
          }
          throw new Error(message);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let carry = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          carry += decoder.decode(value, { stream: true });
          const lines = carry.split("\n");
          carry = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            let event: StreamEvent;
            try {
              event = JSON.parse(line) as StreamEvent;
            } catch {
              continue;
            }

            if (event.type === "delta") {
              buffered += event.text;
              if (frame == null) frame = requestAnimationFrame(flush);
              continue;
            }

            if (event.type === "status") {
              setState((s) => ({
                ...s,
                status: { label: event.label, step: event.step, of: event.of },
              }));
            }
            if (event.type === "error") {
              setState((s) => ({ ...s, error: event.message }));
            }
            handlers.onEvent?.(event);
          }
        }

        if (frame != null) cancelAnimationFrame(frame);
        flush();
        setState((s) => ({ ...s, running: false, status: null }));
      } catch (error) {
        if (frame != null) cancelAnimationFrame(frame);
        if ((error as Error).name === "AbortError") {
          setState({ running: false, status: null, error: null });
          return;
        }
        setState({
          running: false,
          status: null,
          error:
            error instanceof Error ? error.message : "Something went wrong.",
        });
      }
    },
    [],
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  // Deliberately no abort-on-unmount. In development React double-invokes
  // effects, and tearing the stream down on the simulated unmount would kill
  // a request the remount is guarded against restarting. Superseding runs and
  // explicit cancel() still abort through the same controller.

  return { ...state, run, cancel };
}
