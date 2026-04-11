export const defaultShaderSource = `#version 300 es
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
`;
