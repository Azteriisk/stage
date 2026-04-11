import { useState } from "react";
import { Panel } from "../../../components/panels/Panel";
import { CodeEditor } from "../../../components/editor/CodeEditor";
import { shaderPresets } from "../library/shaderPresets";
import { usePatchbayStore } from "../../../lib/state/appStore";

type ShaderPanelProps = {
  shaderError: string | null;
};

export function ShaderPanel({ shaderError }: ShaderPanelProps) {
  const [selectedPresetId, setSelectedPresetId] = useState(shaderPresets[0]?.id ?? "");
  const shaderSource = usePatchbayStore((state) => state.session.shader.source);
  const loadShaderPreset = usePatchbayStore((state) => state.loadShaderPreset);
  const updateShaderSource = usePatchbayStore((state) => state.updateShaderSource);
  const selectedPreset = shaderPresets.find((preset) => preset.id === selectedPresetId);

  return (
    <Panel
      title="Shader"
      description="Fullscreen fragment shader driving the entire background."
      footer={
        <span className={shaderError ? "status status--error" : "status"}>
          {shaderError ?? "Live compile ready"}
        </span>
      }
    >
      <div className="library-bar">
        <label className="binding-field">
          <span>Shader Library</span>
          <select
            onChange={(event) => setSelectedPresetId(event.target.value)}
            value={selectedPresetId}
          >
            {shaderPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          <small>{selectedPreset?.description ?? "Preset shader scene"}</small>
        </label>
        <button
          className="button"
          onClick={() => {
            if (selectedPreset) {
              loadShaderPreset(selectedPreset.source);
            }
          }}
          type="button"
        >
          Load Shader
        </button>
      </div>
      <CodeEditor
        ariaLabel="Shader source"
        onChange={updateShaderSource}
        value={shaderSource}
      />
    </Panel>
  );
}
