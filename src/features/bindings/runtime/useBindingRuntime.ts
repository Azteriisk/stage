import { useEffect, useMemo, useRef } from "react";
import { usePatchbayStore } from "../../../lib/state/appStore";
import { compileBindings, evaluateCompiledBindings } from "./evaluateBindings";

export function useBindingRuntime() {
  const bindings = usePatchbayStore((state) => state.session.bindings);
  const musicExports = usePatchbayStore((state) => state.runtime.musicExports);
  const setShaderInputs = usePatchbayStore((state) => state.setShaderInputs);
  const compiledBindings = useMemo(() => compileBindings(bindings), [bindings]);
  const previousValuesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const activeTargets = new Set(compiledBindings.map(({ binding }) => binding.targetKey));

    previousValuesRef.current = Object.fromEntries(
      Object.entries(previousValuesRef.current).filter(([key]) => activeTargets.has(key)),
    );
  }, [compiledBindings]);

  useEffect(() => {
    const nextInputs = evaluateCompiledBindings(
      compiledBindings,
      { music: musicExports },
      previousValuesRef.current,
    );

    previousValuesRef.current = {
      ...previousValuesRef.current,
      ...nextInputs,
    };

    setShaderInputs(nextInputs);
  }, [compiledBindings, musicExports, setShaderInputs]);
}
