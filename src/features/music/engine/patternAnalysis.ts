export type PatternLike = {
  queryArc: (
    begin: number,
    end: number,
    controls?: Record<string, number>,
  ) => unknown[];
};

type MusicExports = Record<string, number>;
type PatternEvent = {
  hasOnset?: () => boolean;
  part?: {
    begin?: { valueOf: () => number };
    end?: { valueOf: () => number };
  };
  whole?: {
    begin?: { valueOf: () => number };
  };
  value?: unknown;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function noteNameToMidi(note: string): number | null {
  const match = note
    .trim()
    .match(/^([a-gA-G])([#bsf]*)(-?\d+)?$/);

  if (!match) {
    return null;
  }

  const [, pitchClass, accidentals = "", octaveText] = match;
  const chromaMap: Record<string, number> = {
    a: 9,
    b: 11,
    c: 0,
    d: 2,
    e: 4,
    f: 5,
    g: 7,
  };
  const base = chromaMap[pitchClass.toLowerCase()];

  if (base === undefined) {
    return null;
  }

  let offset = 0;

  for (const accidental of accidentals.toLowerCase()) {
    if (accidental === "#") {
      offset += 1;
    } else if (accidental === "b" || accidental === "f") {
      offset -= 1;
    } else if (accidental === "s") {
      offset += 1;
    }
  }

  const octave = octaveText === undefined || octaveText === "" ? 3 : Number(octaveText);

  if (!Number.isFinite(octave)) {
    return null;
  }

  return (octave + 1) * 12 + base + offset;
}

function readNestedValue(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;

  if (record.note !== undefined) {
    return record.note;
  }

  if (record.n !== undefined) {
    return record.n;
  }

  if (record.value !== undefined) {
    return readNestedValue(record.value);
  }

  return value;
}

function toMidiLike(value: unknown): number | null {
  const candidate = readNestedValue(value);

  if (typeof candidate === "number") {
    return candidate;
  }

  if (typeof candidate === "string") {
    return noteNameToMidi(candidate);
  }

  if (typeof value === "number") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const event = value as {
    note?: number | string;
    n?: number;
    value?: unknown;
    velocity?: number;
    gain?: number;
    amp?: number;
    postgain?: number;
  };

  if (typeof event.note === "number") {
    return event.note;
  }

  if (typeof event.note === "string") {
    return noteNameToMidi(event.note);
  }

  if (typeof event.n === "number") {
    return event.n;
  }

  if (typeof event.n === "string") {
    return noteNameToMidi(event.n);
  }

  if (event.value !== undefined) {
    return toMidiLike(event.value);
  }

  return null;
}

function getEventWeight(value: unknown) {
  if (!value || typeof value !== "object") {
    return 1;
  }

  const event = value as {
    velocity?: number;
    gain?: number;
    amp?: number;
    postgain?: number;
    value?: unknown;
  };

  if (typeof event.velocity === "number") {
    return event.velocity;
  }

  if (typeof event.gain === "number") {
    return event.gain;
  }

  if (typeof event.amp === "number") {
    return event.amp;
  }

  if (typeof event.postgain === "number") {
    return event.postgain;
  }

  if (event.value !== undefined) {
    return getEventWeight(event.value);
  }

  return 1;
}

export function analyzePatternFrame(
  pattern: PatternLike | null,
  cycle: number,
  cps: number,
): MusicExports {
  if (!pattern || !Number.isFinite(cycle) || cps <= 0) {
    return {
      barPhase: 0,
      density: 0,
      energy: 0,
      note: 0,
      pulse: 0,
    };
  }

  const cyclePhase = ((cycle % 1) + 1) % 1;
  const pulseWindow = 1 / 64;
  const densityWindow = 1 / 4;
  const lookBehindWindow = 1 / 32;
  const analysisEvents = pattern
    .queryArc(Math.max(cycle - lookBehindWindow, 0), cycle + densityWindow, { _cps: cps })
    .map((event) => event as PatternEvent);
  const onsetEvents = analysisEvents.filter((event) => event.hasOnset?.() ?? false);
  const densityEvents = onsetEvents.filter((event) => {
    const begin = event.whole?.begin?.valueOf?.();

    return typeof begin === "number" && begin >= cycle;
  });
  const pulseEvents = onsetEvents.filter((event) => {
    const begin = event.whole?.begin?.valueOf?.();

    return typeof begin === "number" && begin <= cycle + pulseWindow;
  });
  const activeNoteEvents = analysisEvents.filter((event) => {
    const begin = event.part?.begin?.valueOf?.();
    const end = event.part?.end?.valueOf?.();

    return typeof begin === "number" && typeof end === "number" && begin <= cycle && end >= cycle;
  });
  const noteSourceEvents = activeNoteEvents.length > 0 ? activeNoteEvents : pulseEvents;

  const eventCount = densityEvents.length;
  const pulseEnergy = pulseEvents.reduce(
    (sum, event) => sum + getEventWeight(event.value),
    0,
  );
  const midiValues = noteSourceEvents
    .map((event) => toMidiLike(event.value))
    .filter((value): value is number => value !== null);
  const averageMidi =
    midiValues.length > 0
      ? midiValues.reduce((sum, value) => sum + value, 0) / midiValues.length
      : 48;

  return {
    barPhase: cyclePhase,
    density: clamp(eventCount / 6),
    energy: pulseEvents.length > 0 ? clamp(pulseEnergy / pulseEvents.length) : 0,
    note: clamp((averageMidi - 24) / 72),
    pulse: pulseEvents.length > 0 ? 1 : 0,
  };
}
