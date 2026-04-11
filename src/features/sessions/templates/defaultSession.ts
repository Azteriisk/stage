import { defaultBindings } from "../../bindings/defaults/defaultBindings";
import { defaultMusicSource } from "../../music/defaults/defaultMusicSource";
import { defaultShaderSource } from "../../shader/defaults/defaultShaderSource";
import type { Session } from "../schema/session";

export function createDefaultSession(): Session {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: "stage session",
    version: 1,
    createdAt: now,
    updatedAt: now,
    shader: {
      source: defaultShaderSource,
      entry: "mainImage",
      uniforms: {
        uEnergy: { type: "float", defaultValue: 0.5 },
        uPulse: { type: "float", defaultValue: 0.5 },
        uWarp: { type: "float", defaultValue: 0.0 },
      },
    },
    music: {
      source: defaultMusicSource,
      engine: "strudel",
      exports: {
        energy: { type: "number", description: "Envelope-like energy value" },
        barPhase: { type: "number", description: "Position inside the current bar" },
        density: { type: "number", description: "Pseudo-density for shader routing" },
        note: { type: "number", description: "Average note center mapped to 0..1" },
        pulse: { type: "number", description: "Beat pulse signal" },
      },
    },
    bindings: defaultBindings,
    transport: {
      bpm: 124,
      playing: false,
    },
    ui: {
      layout: {
        leftWidth: 1,
        centerWidth: 0.9,
        rightWidth: 1,
      },
      activePanel: "bindings",
      inspectorOpen: true,
    },
    metadata: {
      description: "Starter patch that routes mock music exports into the shader.",
      tags: ["starter", "local"],
    },
  };
}
