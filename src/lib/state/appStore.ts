import { create } from "zustand";
import type { Binding, Session } from "../../features/sessions/schema/session";
import { createDefaultSession } from "../../features/sessions/templates/defaultSession";
import {
  createShaderInputState,
  extractShaderUniforms,
  isBindableShaderUniform,
} from "../../features/shader/runtime/uniforms";

type RuntimeState = {
  musicExports: Record<string, number>;
  shaderInputs: Record<string, number>;
};

type PatchbayState = {
  session: Session;
  runtime: RuntimeState;
  loadSession: (session: Session) => void;
  setMusicExports: (exports: Record<string, number>) => void;
  setShaderInputs: (inputs: Record<string, number>) => void;
  setTransportPlaying: (playing: boolean) => void;
  addBinding: () => void;
  removeBinding: (bindingId: string) => void;
  updateBinding: (bindingId: string, patch: Partial<Binding>) => void;
  updateShaderSource: (source: string) => void;
  updateMusicSource: (source: string) => void;
  loadShaderPreset: (source: string) => void;
  loadMusicPreset: (source: string) => void;
  toggleBinding: (bindingId: string) => void;
};

const initialSession = createDefaultSession();

function getNextBindableShaderUniforms(session: Session) {
  return Object.entries(session.shader.uniforms)
    .filter(([, uniform]) => isBindableShaderUniform(uniform))
    .map(([key]) => key);
}

export const usePatchbayStore = create<PatchbayState>((set) => ({
  session: initialSession,
  runtime: {
    musicExports: {
      energy: 0.5,
      barPhase: 0,
      density: 0.35,
      note: 0.5,
      pulse: 0.5,
    },
    shaderInputs: {
      uEnergy: 0.5,
      uPulse: 0.5,
      uWarp: 0,
    },
  },
  loadSession: (session) => {
    const nextUniforms = extractShaderUniforms(session.shader.source, session.shader.uniforms);

    set({
      session: {
        ...session,
        transport: {
          ...session.transport,
          playing: false,
        },
        shader: {
          ...session.shader,
          uniforms: nextUniforms,
        },
      },
      runtime: {
        musicExports: {
          energy: 0.5,
          barPhase: 0,
          density: 0.35,
          note: 0.5,
          pulse: 0.5,
        },
        shaderInputs: createShaderInputState(nextUniforms),
      },
    });
  },
  setMusicExports: (musicExports) => {
    set((state) => ({
      runtime: {
        ...state.runtime,
        musicExports,
      },
    }));
  },
  setShaderInputs: (shaderInputs) => {
    set((state) => ({
      runtime: {
        ...state.runtime,
        shaderInputs: {
          ...state.runtime.shaderInputs,
          ...shaderInputs,
        },
      },
    }));
  },
  addBinding: () => {
    set((state) => {
      const sourceKey = Object.keys(state.session.music.exports)[0] ?? "energy";
      const targetKey = getNextBindableShaderUniforms(state.session)[0] ?? "uValue";

      return {
        session: {
          ...state.session,
          updatedAt: new Date().toISOString(),
          bindings: [
            ...state.session.bindings,
            {
              id: crypto.randomUUID(),
              enabled: true,
              sourceScope: "music",
              sourceKey,
              targetScope: "shader",
              targetKey,
              expression: `music.${sourceKey}`,
              smoothing: 0,
              clamp: { min: 0, max: 1 },
            },
          ],
        },
      };
    });
  },
  removeBinding: (bindingId) => {
    set((state) => ({
      session: {
        ...state.session,
        updatedAt: new Date().toISOString(),
        bindings: state.session.bindings.filter((binding) => binding.id !== bindingId),
      },
    }));
  },
  updateBinding: (bindingId, patch) => {
    set((state) => ({
      session: {
        ...state.session,
        updatedAt: new Date().toISOString(),
        bindings: state.session.bindings.map((binding) =>
          binding.id === bindingId
            ? {
                ...binding,
                ...patch,
              }
            : binding,
        ),
      },
    }));
  },
  setTransportPlaying: (playing) => {
    set((state) => ({
      session: {
        ...state.session,
        updatedAt: new Date().toISOString(),
        transport: {
          ...state.session.transport,
          playing,
        },
      },
    }));
  },
  updateShaderSource: (source) => {
    set((state) => {
      const uniforms = extractShaderUniforms(source, state.session.shader.uniforms);

      return {
        session: {
          ...state.session,
          updatedAt: new Date().toISOString(),
          shader: {
            ...state.session.shader,
            source,
            uniforms,
          },
        },
        runtime: {
          ...state.runtime,
          shaderInputs: {
            ...createShaderInputState(uniforms),
            ...Object.fromEntries(
              Object.keys(uniforms).map((key) => [key, state.runtime.shaderInputs[key] ?? 0]),
            ),
          },
        },
      };
    });
  },
  updateMusicSource: (source) => {
    set((state) => ({
      session: {
        ...state.session,
        updatedAt: new Date().toISOString(),
        music: {
          ...state.session.music,
          source,
        },
      },
    }));
  },
  loadShaderPreset: (source) => {
    set((state) => {
      const uniforms = extractShaderUniforms(source, state.session.shader.uniforms);

      return {
        session: {
          ...state.session,
          updatedAt: new Date().toISOString(),
          shader: {
            ...state.session.shader,
            source,
            uniforms,
          },
        },
        runtime: {
          ...state.runtime,
          shaderInputs: {
            ...createShaderInputState(uniforms),
          },
        },
      };
    });
  },
  loadMusicPreset: (source) => {
    set((state) => ({
      session: {
        ...state.session,
        updatedAt: new Date().toISOString(),
        music: {
          ...state.session.music,
          source,
        },
        transport: {
          ...state.session.transport,
          playing: false,
        },
      },
    }));
  },
  toggleBinding: (bindingId) => {
    set((state) => ({
      session: {
        ...state.session,
        updatedAt: new Date().toISOString(),
        bindings: state.session.bindings.map((binding) =>
          binding.id === bindingId
            ? { ...binding, enabled: !binding.enabled }
            : binding,
        ),
      },
    }));
  },
}));
