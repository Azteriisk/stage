import { useEffect, useRef } from "react";
import { usePatchbayStore } from "../../../lib/state/appStore";
import { analyzePatternFrame, type PatternLike } from "./patternAnalysis";
import { getCurrentStrudelCps, getCurrentStrudelCycle } from "./strudelRuntime";

type StrudelClockOptions = {
  pattern: PatternLike | null;
};

export function useStrudelClock({ pattern }: StrudelClockOptions) {
  const playing = usePatchbayStore((state) => state.session.transport.playing);
  const needsAnalysis = usePatchbayStore((state) =>
    state.session.bindings.some(
      (binding) => binding.enabled && binding.sourceScope === "music",
    ),
  );
  const setMusicExports = usePatchbayStore((state) => state.setMusicExports);
  const lastUpdateTimeRef = useRef<number | null>(null);
  const energyEnvelopeRef = useRef(0);
  const noteHoldRef = useRef(0);
  const cpsRef = useRef(0.5);

  useEffect(() => {
    let cancelled = false;

    const syncCps = async () => {
      try {
        const nextCps = await getCurrentStrudelCps();

        if (!cancelled && Number.isFinite(nextCps) && nextCps > 0) {
          cpsRef.current = nextCps;
        }
      } catch {
        // Ignore CPS sync errors and continue using the previous value.
      }
    };

    const updateExports = async () => {
      const cps = cpsRef.current;
      const timestamp = performance.now();
      const lastUpdateTime = lastUpdateTimeRef.current ?? timestamp;
      const deltaSeconds = Math.max((timestamp - lastUpdateTime) / 1000, 0);

      lastUpdateTimeRef.current = timestamp;

      if (playing) {
        const cycle = await getCurrentStrudelCycle();

        if (cancelled) {
          return;
        }

        if (!needsAnalysis) {
          setMusicExports({
            barPhase: ((cycle % 1) + 1) % 1,
            density: 0,
            energy: 0,
            note: 0,
            pulse: 0,
          });
          return;
        }

        const exports = analyzePatternFrame(pattern, cycle, cps);
        const decay = Math.exp(-deltaSeconds * 8);

        energyEnvelopeRef.current = Math.max(exports.energy, energyEnvelopeRef.current * decay);

        if (exports.note > 0) {
          noteHoldRef.current = exports.note;
        }

        setMusicExports({
          ...exports,
          energy: energyEnvelopeRef.current,
          note: noteHoldRef.current,
        });
      } else {
        energyEnvelopeRef.current = 0;
        noteHoldRef.current = 0;
        setMusicExports(
          needsAnalysis
            ? analyzePatternFrame(pattern, 0, cps)
            : {
                barPhase: 0,
                density: 0,
                energy: 0,
                note: 0,
                pulse: 0,
              },
        );
      }
    };

    void syncCps();
    void updateExports();
    const runExportUpdate = () => {
      if (!needsAnalysis) {
        void updateExports();
        return;
      }

      if ("requestIdleCallback" in window && typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => {
          void updateExports();
        }, { timeout: 120 });
        return;
      }

      void updateExports();
    };

    const exportIntervalId = window.setInterval(runExportUpdate, needsAnalysis ? 200 : 125);
    const cpsIntervalId = window.setInterval(() => {
      void syncCps();
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(exportIntervalId);
      window.clearInterval(cpsIntervalId);
    };
  }, [needsAnalysis, pattern, playing, setMusicExports]);
}
