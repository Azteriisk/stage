import { useEffect, useState } from "react";
import { usePatchbayStore } from "../../../lib/state/appStore";
import type { PatternLike } from "./patternAnalysis";
import {
  ensureStrudel,
  getCurrentStrudelCps,
  getRecentStrudelLogs,
  getStrudelAudioContextState,
  getStrudelRuntimeState,
  playStrudelCode,
  prepareStrudelAudio,
  stopStrudelPlayback,
  unlockStrudelAudio,
} from "./strudelRuntime";
import { useStrudelClock } from "./useStrudelClock";

type EngineStatus = "idle" | "loading" | "ready" | "playing" | "error";
type DebugState = {
  audioContextState: string;
  cps: number;
  evalError: string | null;
  lastAction: string;
  patternReady: boolean;
  samplerLogs: string[];
  schedulerError: string | null;
  started: boolean;
  warmupSummary: string | null;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown Strudel runtime error.";
}

export function useStrudelEngine() {
  const source = usePatchbayStore((state) => state.session.music.source);
  const playing = usePatchbayStore((state) => state.session.transport.playing);
  const setTransportPlaying = usePatchbayStore((state) => state.setTransportPlaying);
  const [status, setStatus] = useState<EngineStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pattern, setPattern] = useState<PatternLike | null>(null);
  const [debug, setDebug] = useState<DebugState>({
    audioContextState: "unknown",
    cps: 0.5,
    evalError: null,
    lastAction: "boot",
    patternReady: false,
    samplerLogs: [],
    schedulerError: null,
    started: false,
    warmupSummary: null,
  });

  useStrudelClock({ pattern });

  useEffect(() => {
    void ensureStrudel()
      .then(() => {
        setStatus((current) => (current === "idle" ? "ready" : current));
        return Promise.all([getStrudelAudioContextState(), getCurrentStrudelCps()]);
      })
      .then(([audioContextState, cps]) => {
        setDebug((current) => ({
          ...current,
          audioContextState,
          cps,
          lastAction: "runtime-ready",
        }));
      })
      .catch((caughtError) => {
        setStatus("error");
        setError(getErrorMessage(caughtError));
      });
  }, []);

  useEffect(() => {
    void prepareStrudelAudio().catch(() => {
      // The audio unlock listener is best-effort and should not put the app
      // into an error state before the user actually tries to play.
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncDebug = async () => {
      try {
        const cps = await getCurrentStrudelCps();

        if (!cancelled && Number.isFinite(cps) && cps > 0) {
          setDebug((current) => ({
            ...current,
            cps,
            samplerLogs: getRecentStrudelLogs(),
          }));
        }
      } catch {
        // Ignore CPS polling errors and keep the last known value.
      }
    };

    void syncDebug();
    const intervalId = window.setInterval(() => {
      void syncDebug();
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const play = async () => {
    try {
      setStatus("loading");
      setDebug((current) => ({
        ...current,
        lastAction: "play-clicked",
      }));
      await unlockStrudelAudio();
      setDebug((current) => ({
        ...current,
        audioContextState: "running",
        lastAction: "audio-unlocked",
      }));
      const result = await playStrudelCode(source);
      const pattern = result.pattern;
      let audioContextState = await getStrudelAudioContextState();

      if (audioContextState === "suspended") {
        await unlockStrudelAudio();
        audioContextState = await getStrudelAudioContextState();
      }

      const runtimeState = await getStrudelRuntimeState();
      const cps = await getCurrentStrudelCps();
      setPattern(pattern ?? null);
      setTransportPlaying(true);
      setStatus("playing");
      setError(null);
      setDebug((current) => ({
        ...current,
        audioContextState,
        cps,
        evalError: runtimeState.evalError,
        lastAction: "pattern-evaluated",
        patternReady: Boolean(pattern),
        samplerLogs: getRecentStrudelLogs(),
        schedulerError: runtimeState.schedulerError,
        started: runtimeState.started,
        warmupSummary:
          result.warmup && result.warmup.pendingCount > 0
            ? `Warmed ${result.warmup.loadedCount}/${result.warmup.pendingCount} sample buffers for ${result.warmup.soundNames.join(", ")}`
            : null,
      }));
    } catch (caughtError) {
      setPattern(null);
      setTransportPlaying(false);
      setStatus("error");
      setError(getErrorMessage(caughtError));
      setDebug((current) => ({
        ...current,
        evalError: getErrorMessage(caughtError),
        lastAction: "play-error",
        patternReady: false,
        samplerLogs: getRecentStrudelLogs(),
      }));
    }
  };

  const stop = async () => {
    try {
      await stopStrudelPlayback();
      setPattern(null);
      setTransportPlaying(false);
      setStatus("ready");
      setError(null);
      setDebug((current) => ({
        ...current,
        evalError: null,
        lastAction: "stopped",
        patternReady: false,
        samplerLogs: getRecentStrudelLogs(),
        schedulerError: null,
        started: false,
        warmupSummary: null,
      }));
    } catch (caughtError) {
      setStatus("error");
      setError(getErrorMessage(caughtError));
    }
  };

  return {
    error,
    debug,
    play,
    playing,
    status,
    stop,
  };
}
