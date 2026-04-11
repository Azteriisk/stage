import { useState } from "react";
import { Panel } from "../../../components/panels/Panel";
import { CodeEditor } from "../../../components/editor/CodeEditor";
import { musicPresets } from "../library/musicPresets";
import { usePatchbayStore } from "../../../lib/state/appStore";

type MusicPanelProps = {
  debug: {
    audioContextState: string;
    cps: number;
    evalError: string | null;
    lastAction: string;
    patternReady: boolean;
    samplerLogs: string[];
    schedulerError: string | null;
    started: boolean;
    warmupSummary: string | null;
  };
  engineError: string | null;
  engineStatus: string;
  onPlay: () => void | Promise<void>;
  onStop: () => void | Promise<void>;
};

export function MusicPanel({
  debug,
  engineError,
  engineStatus,
  onPlay,
  onStop,
}: MusicPanelProps) {
  const [selectedPresetId, setSelectedPresetId] = useState(musicPresets[0]?.id ?? "");
  const musicSource = usePatchbayStore((state) => state.session.music.source);
  const loadMusicPreset = usePatchbayStore((state) => state.loadMusicPreset);
  const playing = usePatchbayStore((state) => state.session.transport.playing);
  const updateMusicSource = usePatchbayStore((state) => state.updateMusicSource);
  const selectedPreset = musicPresets.find((preset) => preset.id === selectedPresetId);

  return (
    <Panel
      title="Music"
      description="Live Strudel runtime. Tempo and transport shaping belong in the code."
      footer={
        <>
          <div className="transport-controls">
            <button className="button" onClick={() => void onPlay()} type="button">
              {playing ? "Restart" : "Play"}
            </button>
            <button className="button button--ghost" onClick={() => void onStop()} type="button">
              Stop
            </button>
          </div>
          <span className={engineError ? "status status--error" : "status"}>
            {engineError ?? engineStatus}
          </span>
        </>
      }
      >
        <div className="library-bar">
          <label className="binding-field">
            <span>Sound Library</span>
            <select
              onChange={(event) => setSelectedPresetId(event.target.value)}
              value={selectedPresetId}
            >
              {musicPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <small>{selectedPreset?.description ?? "Preset pattern"}</small>
          </label>
          <button
            className="button"
            onClick={() => {
              if (selectedPreset) {
                loadMusicPreset(selectedPreset.source);
              }
            }}
            type="button"
          >
            Load Pattern
          </button>
        </div>
        <CodeEditor
          ariaLabel="Music source"
          language="javascript"
          onChange={updateMusicSource}
          value={musicSource}
        />
        <div className="music-debug">
          <p className="inspector-card__title">Runtime Debug</p>
          <ul className="inspector-card__list">
            <li>
              <span>Status</span>
              <strong>{engineStatus}</strong>
            </li>
            <li>
              <span>CPS</span>
              <strong>{debug.cps.toFixed(2)}</strong>
            </li>
            <li>
              <span>Cycle</span>
              <strong>{(1 / Math.max(debug.cps, 0.001)).toFixed(2)}s</strong>
            </li>
            <li>
              <span>Audio Context</span>
              <strong>{debug.audioContextState}</strong>
            </li>
            <li>
              <span>Last Action</span>
              <strong>{debug.lastAction}</strong>
            </li>
            <li>
              <span>Pattern Ready</span>
              <strong>{debug.patternReady ? "yes" : "no"}</strong>
            </li>
            <li>
              <span>Started</span>
              <strong>{debug.started ? "yes" : "no"}</strong>
            </li>
          </ul>
          {debug.evalError ? (
            <p className="music-debug__error">Eval: {debug.evalError}</p>
          ) : null}
          {debug.schedulerError ? (
            <p className="music-debug__error">Scheduler: {debug.schedulerError}</p>
          ) : null}
          {debug.warmupSummary ? (
            <p className="music-debug__note">{debug.warmupSummary}</p>
          ) : null}
          {debug.samplerLogs.length > 0 ? (
            <ul className="music-debug__log">
              {debug.samplerLogs.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </Panel>
  );
}
