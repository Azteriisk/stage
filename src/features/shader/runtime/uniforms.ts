import type { Session } from "../../sessions/schema/session";

const reservedUniforms = new Set(["uResolution", "uTime"]);

type UniformType = Session["shader"]["uniforms"][string]["type"];
type UniformDefinition = Session["shader"]["uniforms"][string];

function getDefaultValue(type: UniformType): UniformDefinition["defaultValue"] {
  switch (type) {
    case "vec2":
      return [0, 0];
    case "vec3":
      return [0, 0, 0];
    case "vec4":
      return [0, 0, 0, 0];
    case "bool":
      return false;
    default:
      return 0;
  }
}

export function extractShaderUniforms(
  source: string,
  existingUniforms: Session["shader"]["uniforms"],
) {
  const matches = source.matchAll(
    /uniform\s+(float|vec2|vec3|vec4|int|bool)\s+([A-Za-z_][A-Za-z0-9_]*)\s*;/g,
  );
  const uniforms: Session["shader"]["uniforms"] = {};

  for (const match of matches) {
    const [, type, name] = match;

    if (
      !type ||
      !name ||
      reservedUniforms.has(name)
    ) {
      continue;
    }

    const nextType = type as UniformType;
    const existing = existingUniforms[name];

    uniforms[name] = {
      type: nextType,
      defaultValue:
        existing && existing.type === nextType
          ? existing.defaultValue
          : getDefaultValue(nextType),
    };
  }

  return uniforms;
}

export function createShaderInputState(uniforms: Session["shader"]["uniforms"]) {
  return Object.fromEntries(
    Object.entries(uniforms).map(([key, value]) => [
      key,
      typeof value.defaultValue === "number"
        ? value.defaultValue
        : typeof value.defaultValue === "boolean"
          ? Number(value.defaultValue)
          : Array.isArray(value.defaultValue)
            ? Number(value.defaultValue[0] ?? 0)
            : 0,
    ]),
  );
}

export function isBindableShaderUniform(uniform: UniformDefinition) {
  return uniform.type === "float" || uniform.type === "int" || uniform.type === "bool";
}
