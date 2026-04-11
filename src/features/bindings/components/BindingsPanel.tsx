import { Panel } from "../../../components/panels/Panel";
import { usePatchbayStore } from "../../../lib/state/appStore";
import { isBindableShaderUniform } from "../../shader/runtime/uniforms";

export function BindingsPanel() {
  const bindings = usePatchbayStore((state) => state.session.bindings);
  const musicDefinitions = usePatchbayStore((state) => state.session.music.exports);
  const shaderUniforms = usePatchbayStore((state) => state.session.shader.uniforms);
  const shaderInputs = usePatchbayStore((state) => state.runtime.shaderInputs);
  const musicExports = usePatchbayStore((state) => state.runtime.musicExports);
  const addBinding = usePatchbayStore((state) => state.addBinding);
  const removeBinding = usePatchbayStore((state) => state.removeBinding);
  const updateBinding = usePatchbayStore((state) => state.updateBinding);
  const toggleBinding = usePatchbayStore((state) => state.toggleBinding);
  const sourceKeys = Object.keys(musicDefinitions);
  const targetKeys = Object.entries(shaderUniforms)
    .filter(([, uniform]) => isBindableShaderUniform(uniform))
    .map(([key]) => key);

  return (
    <Panel
      title="Bindings"
      description="Route music signals into shader uniforms."
      footer={
        <>
          <div className="transport-controls">
            <button className="button" onClick={addBinding} type="button">
              Add Route
            </button>
          </div>
          <span>{bindings.filter((binding) => binding.enabled).length} routes active</span>
        </>
      }
    >
      <div className="bindings-panel">
        <div className="bindings-helper">
          <p className="bindings-helper__title">How to use this</p>
          <p className="bindings-helper__copy">
            Think in routes: <code>music signal -&gt; shader uniform</code>.
            For example, if your shader defines <code>uniform float uBrightness;</code>,
            you can route <code>energy</code> into <code>uBrightness</code> and the
            background will brighten with the music.
          </p>
        </div>

        <div className="binding-list">
          {bindings.map((binding) => (
            <article className="binding-card" key={binding.id}>
              <div className="binding-card__row">
                <label className="binding-card__toggle">
                  <input
                    checked={binding.enabled}
                    onChange={() => toggleBinding(binding.id)}
                    type="checkbox"
                  />
                  <span>Active</span>
                </label>
                <button
                  className="button button--ghost"
                  onClick={() => removeBinding(binding.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>

              <div className="binding-route-preview">
                <strong>Route</strong>
                <span>
                  music.{binding.sourceKey} -&gt; {binding.targetKey}
                </span>
              </div>

              <div className="binding-form-grid">
                <label className="binding-field">
                  <span>Music Signal</span>
                  <select
                    onChange={(event) =>
                      updateBinding(binding.id, {
                        sourceKey: event.target.value,
                        expression:
                          binding.expression === `music.${binding.sourceKey}`
                            ? `music.${event.target.value}`
                            : binding.expression,
                      })
                    }
                    value={binding.sourceKey}
                  >
                    {sourceKeys.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                  <small>{musicDefinitions[binding.sourceKey]?.description ?? "Signal export"}</small>
                </label>

                <label className="binding-field">
                  <span>Shader Uniform</span>
                  <select
                    onChange={(event) =>
                      updateBinding(binding.id, {
                        targetKey: event.target.value,
                      })
                    }
                    value={binding.targetKey}
                  >
                    {targetKeys.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="binding-field">
                  <span>Response</span>
                  <input
                    max={0.999}
                    min={0}
                    onChange={(event) =>
                      updateBinding(binding.id, {
                        smoothing: Number(event.target.value),
                      })
                    }
                    step={0.05}
                    type="number"
                    value={binding.smoothing ?? 0}
                  />
                  <small>Higher values react more slowly.</small>
                </label>
              </div>

              <div className="binding-form-grid binding-form-grid--clamp">
                <label className="binding-field">
                  <span>Range Min</span>
                  <input
                    onChange={(event) =>
                      updateBinding(binding.id, {
                        clamp: {
                          min: Number(event.target.value),
                          max: binding.clamp?.max ?? 1,
                        },
                      })
                    }
                    step={0.05}
                    type="number"
                    value={binding.clamp?.min ?? 0}
                  />
                </label>

                <label className="binding-field">
                  <span>Range Max</span>
                  <input
                    onChange={(event) =>
                      updateBinding(binding.id, {
                        clamp: {
                          min: binding.clamp?.min ?? 0,
                          max: Number(event.target.value),
                        },
                      })
                    }
                    step={0.05}
                    type="number"
                    value={binding.clamp?.max ?? 1}
                  />
                </label>
              </div>

              <details className="binding-advanced">
                <summary>Advanced formula</summary>
                <p className="binding-advanced__hint">
                  Leave this as <code>music.{binding.sourceKey}</code> for a simple route.
                  Change it only if you want a custom transform.
                </p>
                <textarea
                  className="binding-card__expression"
                  onChange={(event) =>
                    updateBinding(binding.id, { expression: event.target.value })
                  }
                  spellCheck={false}
                  value={binding.expression}
                />
              </details>
            </article>
          ))}
        </div>

        <div className="inspector-grid">
          <div className="inspector-card">
            <p className="inspector-card__title">Music Exports</p>
            <ul className="inspector-card__list">
              {Object.entries(musicExports).map(([key, value]) => (
                <li key={key}>
                  <span>{key}</span>
                  <strong>{value.toFixed(3)}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="inspector-card">
            <p className="inspector-card__title">Shader Inputs</p>
            <ul className="inspector-card__list">
              {Object.entries(shaderInputs).map(([key, value]) => (
                <li key={key}>
                  <span>{key}</span>
                  <strong>{value.toFixed(3)}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Panel>
  );
}
