import { useEffect, useRef } from "react";
import { usePatchbayStore } from "../../../lib/state/appStore";

type ShaderCanvasProps = {
  shaderSource: string;
  shaderUniforms: Record<
    string,
    {
      type: "float" | "vec2" | "vec3" | "vec4" | "int" | "bool";
      defaultValue: number | boolean | number[];
    }
  >;
  onCompileError: (error: string | null) => void;
};

const vertexShaderSource = `#version 300 es
precision highp float;

in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error("Could not create a WebGL shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader compile failure.";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function createProgram(gl: WebGL2RenderingContext, fragmentShaderSource: string) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();

  if (!program) {
    throw new Error("Could not create a WebGL program.");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown program link failure.";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
}

export function ShaderCanvas({
  onCompileError,
  shaderSource,
  shaderUniforms,
}: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shaderInputsRef = useRef<Record<string, number>>({});
  const shaderInputs = usePatchbayStore((state) => state.runtime.shaderInputs);
  const playing = usePatchbayStore((state) => state.session.transport.playing);
  const hasActiveMusicBindings = usePatchbayStore((state) =>
    state.session.bindings.some(
      (binding) => binding.enabled && binding.sourceScope === "music",
    ),
  );

  useEffect(() => {
    shaderInputsRef.current = shaderInputs;
  }, [shaderInputs]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const gl = canvas.getContext("webgl2");

    if (!gl) {
      onCompileError("WebGL2 is not available in this browser.");
      return;
    }

    const positionBuffer = gl.createBuffer();

    if (!positionBuffer) {
      onCompileError("Could not allocate the fullscreen buffer.");
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    let program: WebGLProgram | null = null;

    try {
      program = createProgram(gl, shaderSource);
      onCompileError(null);
    } catch (error) {
      onCompileError(error instanceof Error ? error.message : "Shader compilation failed.");
      gl.deleteBuffer(positionBuffer);
      return;
    }

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const timeLocation = gl.getUniformLocation(program, "uTime");
    const resolutionLocation = gl.getUniformLocation(program, "uResolution");
    const uniformLocations = Object.fromEntries(
      Object.keys(shaderUniforms).map((key) => [key, gl.getUniformLocation(program, key)]),
    );

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    let frameId = 0;
    const start = performance.now();
    const shouldAnimate = !playing || hasActiveMusicBindings;

    const draw = (timestamp: number) => {
      const width = canvas.clientWidth * window.devicePixelRatio;
      const height = canvas.clientHeight * window.devicePixelRatio;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.01, 0.02, 0.05, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);

      if (timeLocation) {
        gl.uniform1f(timeLocation, (timestamp - start) / 1000);
      }

      if (resolutionLocation) {
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      }

      const currentInputs = shaderInputsRef.current;

      for (const [key, definition] of Object.entries(shaderUniforms)) {
        const location = uniformLocations[key];

        if (!location) {
          continue;
        }

        const value = currentInputs[key] ?? 0;

        switch (definition.type) {
          case "int":
            gl.uniform1i(location, Math.round(value));
            break;
          case "bool":
            gl.uniform1i(location, value > 0 ? 1 : 0);
            break;
          default:
            gl.uniform1f(location, value);
        }
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (shouldAnimate) {
        frameId = window.requestAnimationFrame(draw);
      }
    };

    frameId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frameId);
      gl.deleteBuffer(positionBuffer);

      if (program) {
        gl.deleteProgram(program);
      }
    };
  }, [hasActiveMusicBindings, onCompileError, playing, shaderSource, shaderUniforms]);

  return <canvas aria-hidden className="shader-canvas" ref={canvasRef} />;
}
