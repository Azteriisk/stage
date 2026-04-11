export type ShaderPreset = {
  id: string;
  name: string;
  description: string;
  source: string;
};

export const shaderPresets: ShaderPreset[] = [
  {
    id: "starter-warp",
    name: "Starter Warp",
    description: "Soft radial field driven by uEnergy, uPulse, and uWarp.",
    source: `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uEnergy;
uniform float uPulse;
uniform float uWarp;

out vec4 outColor;

vec3 palette(float t) {
  vec3 a = vec3(0.14, 0.18, 0.28);
  vec3 b = vec3(0.68, 0.28, 0.22);
  vec3 c = vec3(0.55, 0.72, 0.88);
  vec3 d = vec3(0.20, 0.35, 0.60);
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
  float radius = length(uv);
  float angle = atan(uv.y, uv.x);
  float ripple = sin(10.0 * radius - uTime * (2.0 + uPulse * 4.0) + angle * (1.0 + uWarp * 2.0));
  float glow = exp(-3.5 * radius) * (0.35 + uEnergy);
  float field = ripple * 0.5 + glow + uPulse * 0.35;
  vec3 color = palette(field + uTime * 0.05 + uWarp * 0.15);
  color += vec3(1.0, 0.7, 0.35) * glow * (0.35 + uEnergy);
  outColor = vec4(color, 1.0);
}
`,
  },
  {
    id: "scanlines",
    name: "Scanlines",
    description: "CRT-like banding with brightness and drift control.",
    source: `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uBrightness;
uniform float uDrift;
uniform float uPulse;

out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float bands = sin((uv.y + uDrift * 0.25) * 180.0 + uTime * 4.0);
  float streak = sin(uv.x * 30.0 - uTime * (3.0 + uPulse * 6.0));
  float glow = 0.45 + 0.45 * bands + 0.2 * streak;
  vec3 base = mix(vec3(0.02, 0.08, 0.18), vec3(0.10, 0.85, 0.75), glow);
  base *= 0.35 + uBrightness * 1.4;
  outColor = vec4(base, 1.0);
}
`,
  },
  {
    id: "void-bloom",
    name: "Void Bloom",
    description: "Soft bloom ring with hue and density controls.",
    source: `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uHueShift;
uniform float uDensity;
uniform float uEnergy;

out vec4 outColor;

vec3 hue(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + t));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
  float d = length(uv);
  float ring = smoothstep(0.38, 0.12, abs(d - (0.22 + 0.08 * sin(uTime * 0.4))));
  float grains = sin((uv.x + uv.y) * (18.0 + uDensity * 24.0) + uTime * 2.0);
  float field = ring + 0.25 * grains + uEnergy * 0.7;
  vec3 color = hue(field * 0.15 + uHueShift + uTime * 0.02);
  color *= field;
  outColor = vec4(color, 1.0);
}
`,
  },
];
