import { useEffect, useState } from "react";
import { BindingsPanel } from "../features/bindings/components/BindingsPanel";
import { useBindingRuntime } from "../features/bindings/runtime/useBindingRuntime";
import { MusicPanel } from "../features/music/components/MusicPanel";
import { useStrudelEngine } from "../features/music/engine/useStrudelEngine";
import { restoreStartupSession, saveDraft } from "../features/sessions/persistence/localSessions";
import { ShaderCanvas } from "../features/shader/components/ShaderCanvas";
import { ShaderPanel } from "../features/shader/components/ShaderPanel";
import { usePatchbayStore } from "../lib/state/appStore";

export function App() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [shaderError, setShaderError] = useState<string | null>(null);
  const session = usePatchbayStore((state) => state.session);
  const loadSession = usePatchbayStore((state) => state.loadSession);
  const {
    debug: musicDebug,
    error: musicError,
    play,
    status: musicStatus,
    stop,
  } = useStrudelEngine();

  useBindingRuntime();

  useEffect(() => {
    let isMounted = true;

    restoreStartupSession()
      .then((restored) => {
        if (!isMounted) {
          return;
        }

        loadSession(restored);
        setIsHydrated(true);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setIsHydrated(true);
      });

    return () => {
      isMounted = false;
    };
  }, [loadSession]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveDraft(session);
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isHydrated, session]);

  return (
    <main className="app-shell">
      <ShaderCanvas
        shaderSource={session.shader.source}
        shaderUniforms={session.shader.uniforms}
        onCompileError={setShaderError}
      />
      <div className="app-shell__overlay">
        <header className="topbar">
          <div>
            <p className="topbar__eyebrow">stage</p>
            <h1>{session.name}</h1>
          </div>
          <div className="topbar__meta">
            <span>{isHydrated ? "autosave active" : "restoring session"}</span>
            <span>{shaderError ? "shader error" : "shader live"}</span>
            <span>{musicError ? "music error" : `music ${musicStatus}`}</span>
          </div>
        </header>

        <section className="workspace-grid">
          <ShaderPanel shaderError={shaderError} />
          <BindingsPanel />
          <MusicPanel
            debug={musicDebug}
            engineError={musicError}
            engineStatus={musicStatus}
            onPlay={play}
            onStop={stop}
          />
        </section>
      </div>
    </main>
  );
}
