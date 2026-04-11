import type { Binding } from "../../sessions/schema/session";

export const defaultBindings: Binding[] = [
  {
    id: "binding-energy",
    enabled: true,
    sourceScope: "music",
    sourceKey: "energy",
    targetScope: "shader",
    targetKey: "uEnergy",
    expression: "clamp(music.energy, 0, 1)",
    clamp: { min: 0, max: 1 },
  },
  {
    id: "binding-pulse",
    enabled: true,
    sourceScope: "music",
    sourceKey: "pulse",
    targetScope: "shader",
    targetKey: "uPulse",
    expression: "smooth(music.pulse, 0.92)",
    clamp: { min: 0, max: 1 },
  },
  {
    id: "binding-warp",
    enabled: true,
    sourceScope: "music",
    sourceKey: "barPhase",
    targetScope: "shader",
    targetKey: "uWarp",
    expression: "music.barPhase",
    clamp: { min: 0, max: 1 },
  },
];
