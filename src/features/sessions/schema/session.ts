import { z } from "zod";

const uniformDefinitionSchema = z.object({
  type: z.enum(["float", "vec2", "vec3", "vec4", "int", "bool"]),
  defaultValue: z.union([z.number(), z.boolean(), z.array(z.number())]),
});

const exportDefinitionSchema = z.object({
  type: z.enum(["number", "boolean", "string"]),
  description: z.string().optional(),
});

const bindingSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  sourceScope: z.enum(["music", "shader"]),
  sourceKey: z.string(),
  targetScope: z.literal("shader"),
  targetKey: z.string(),
  expression: z.string(),
  smoothing: z.number().optional(),
  clamp: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .optional(),
});

export const sessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.literal(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  shader: z.object({
    source: z.string(),
    entry: z.literal("mainImage"),
    uniforms: z.record(z.string(), uniformDefinitionSchema),
  }),
  music: z.object({
    source: z.string(),
    engine: z.literal("strudel"),
    exports: z.record(z.string(), exportDefinitionSchema),
  }),
  bindings: z.array(bindingSchema),
  transport: z.object({
    bpm: z.number(),
    playing: z.boolean(),
  }),
  ui: z.object({
    layout: z.object({
      leftWidth: z.number(),
      centerWidth: z.number(),
      rightWidth: z.number(),
    }),
    activePanel: z.enum(["shader", "bindings", "music"]),
    inspectorOpen: z.boolean(),
  }),
  metadata: z
    .object({
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

export type Session = z.infer<typeof sessionSchema>;
export type Binding = z.infer<typeof bindingSchema>;
export type BindingEvaluationContext = {
  music: Record<string, number>;
};
