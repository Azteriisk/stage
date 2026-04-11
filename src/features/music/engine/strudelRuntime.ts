type StrudelPattern = {
  queryArc: (
    begin: number,
    end: number,
    controls?: Record<string, number>,
  ) => unknown[];
};

type StrudelRepl = {
  evaluate: (
    code: string,
    start?: boolean,
    hush?: boolean,
  ) => Promise<StrudelPattern | undefined>;
  setPattern: (pattern: StrudelPattern, start?: boolean) => Promise<unknown>;
  stop: () => void;
  setCps: (value: number) => void;
  scheduler?: {
    cps?: number;
    now?: () => number;
  };
  state?: {
    evalError?: { message?: string };
    schedulerError?: { message?: string };
    started?: boolean;
  };
};

type LoggerArgs = [message: unknown, type?: unknown, meta?: unknown];
type SampleWarmupResult = {
  loadedCount: number;
  pendingCount: number;
  soundNames: string[];
};
type PatternEventValue = {
  s?: unknown;
  sound?: unknown;
  value?: unknown;
};
type SampleSoundData = {
  type?: string;
  samples?: unknown;
};
type StrudelSound = {
  data?: SampleSoundData;
};
type DirectStrudelModule = {
  core: any;
  mini: any;
  tonal: any;
  transpiler: any;
  webaudio: any;
};

let modulePromise: Promise<DirectStrudelModule> | null = null;
let replPromise: Promise<StrudelRepl> | null = null;
let scopePromise: Promise<void> | null = null;
let defaultSamplesPromise: Promise<void> | null = null;
let loggerInstalled = false;
let recentLoggerEntries: string[] = [];

const DEFAULT_SAMPLE_MAPS = [
  "https://raw.githubusercontent.com/felixroos/dough-samples/main/tidal-drum-machines.json",
  "https://raw.githubusercontent.com/felixroos/dough-samples/main/vcsl.json",
  "https://raw.githubusercontent.com/felixroos/dough-samples/main/piano.json",
];
const MAX_LOG_ENTRIES = 8;
const SAMPLE_WARMUP_BATCH_SIZE = 8;

async function loadStrudelModule() {
  if (!modulePromise) {
    modulePromise = Promise.all([
      import("@strudel/core"),
      import("@strudel/mini"),
      import("@strudel/tonal"),
      import("@strudel/transpiler"),
      import("@strudel/webaudio"),
    ]).then(([core, mini, tonal, transpiler, webaudio]) => ({
      core,
      mini,
      tonal,
      transpiler,
      webaudio,
    }));
  }

  return modulePromise;
}

function installStrudelLogger(strudel: DirectStrudelModule) {
  if (
    loggerInstalled ||
    !("setLogger" in strudel.webaudio) ||
    typeof strudel.webaudio.setLogger !== "function"
  ) {
    return;
  }

  strudel.webaudio.setLogger((...args: LoggerArgs) => {
    const [message, type, meta] = args;
    const prefix = typeof type === "string" ? `[${type}] ` : "";
    const metaUrl =
      meta && typeof meta === "object" && "url" in meta && typeof meta.url === "string"
        ? ` ${meta.url}`
        : "";
    const text = `${prefix}${String(message)}${metaUrl}`.trim();

    if (text.length > 0) {
      recentLoggerEntries = [...recentLoggerEntries.slice(-(MAX_LOG_ENTRIES - 1)), text];
    }

    console.log(...args);
  });

  loggerInstalled = true;
}

async function getStrudelRepl() {
  if (!replPromise) {
    replPromise = (async () => {
      const strudel = await loadStrudelModule();
      installStrudelLogger(strudel);

      return strudel.core.repl({
        defaultOutput: strudel.webaudio.webaudioOutput,
        getTime: () => strudel.webaudio.getAudioContext().currentTime,
        transpiler: strudel.transpiler.transpiler,
        sync: false,
      }) as StrudelRepl;
    })();
  }

  return replPromise;
}

async function ensureStrudelScope() {
  if (!scopePromise) {
    scopePromise = (async () => {
      const strudel = await loadStrudelModule();
      const repl = await getStrudelRepl();

      installStrudelLogger(strudel);
      strudel.mini.miniAllStrings?.();
      await strudel.webaudio.registerSynthSounds?.();
      await strudel.core.evalScope(
        strudel.core.evalScope,
        strudel.core,
        strudel.mini,
        strudel.tonal,
        strudel.webaudio,
        {
          hush: () => repl.stop(),
          evaluate: (code: string, autoplay = true) => repl.evaluate(code, autoplay),
        },
      );

      if (strudel.core.Pattern?.prototype) {
        strudel.core.Pattern.prototype.play = function () {
          void repl.setPattern(this as StrudelPattern, true);
          return this;
        };
      }
    })();
  }

  await scopePromise;
}

async function ensureDefaultSamples() {
  const strudel = await loadStrudelModule();
  installStrudelLogger(strudel);

  if (!defaultSamplesPromise) {
    defaultSamplesPromise = (async () => {
      if (
        !("samples" in strudel.webaudio) ||
        typeof strudel.webaudio.samples !== "function"
      ) {
        return;
      }

      await Promise.allSettled(
        DEFAULT_SAMPLE_MAPS.map((sampleMapUrl) => strudel.webaudio.samples(sampleMapUrl)),
      );
    })();
  }

  await defaultSamplesPromise;
}

function getAvailableSoundNames(strudel: DirectStrudelModule) {
  const soundMap = strudel.webaudio.soundMap as
    | Map<string, unknown>
    | {
        get?: ((key?: string) => Record<string, unknown> | unknown) | undefined;
        keys?: (() => IterableIterator<string>) | undefined;
      }
    | undefined;

  if (!soundMap) {
    return new Set<string>();
  }

  if (soundMap instanceof Map) {
    return new Set(soundMap.keys());
  }

  if (typeof soundMap.keys === "function") {
    return new Set(Array.from(soundMap.keys()));
  }

  if (typeof soundMap.get === "function") {
    const values = soundMap.get();

    if (values && typeof values === "object" && !Array.isArray(values)) {
      return new Set(Object.keys(values));
    }
  }

  return new Set<string>();
}

function normalizeStrudelSource(source: string, strudel: DirectStrudelModule) {
  const patternPrototype = strudel.core.Pattern?.prototype;
  const patternMethods = patternPrototype
    ? new Set(
        Object.getOwnPropertyNames(patternPrototype).filter(
          (key) => key !== "constructor",
        ),
      )
    : new Set<string>();
  const soundNames = getAvailableSoundNames(strudel);
  const withoutVisualizers = source.replace(/\.pianoroll\s*\(([\s\S]*?)\)/gi, "");

  return withoutVisualizers.replace(
    /\.(\s*)([A-Za-z_]\w*)(\s*)\(\s*\)/g,
    (match, leadingSpace, methodName, trailingSpace) => {
      if (patternMethods.has(methodName) || !soundNames.has(methodName)) {
        return match;
      }

      return `.s("${methodName}")`;
    },
  );
}

function flattenSampleUrls(sampleSource: unknown): string[] {
  if (!sampleSource) {
    return [];
  }

  if (typeof sampleSource === "string") {
    return [sampleSource];
  }

  if (Array.isArray(sampleSource)) {
    return sampleSource.flatMap((entry) => flattenSampleUrls(entry));
  }

  if (typeof sampleSource !== "object") {
    return [];
  }

  return Object.entries(sampleSource as Record<string, unknown>)
    .filter(([key]) => !key.startsWith("_"))
    .flatMap(([, value]) => flattenSampleUrls(value));
}

function extractSoundNamesFromSource(source: string) {
  const soundNames = new Set<string>();
  const soundCallPattern = /\.(?:s|sound)\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

  for (const match of source.matchAll(soundCallPattern)) {
    const rawValue = match[1];

    if (!rawValue) {
      continue;
    }

    for (const token of rawValue.split(/\s+/)) {
      const soundName = token.trim().toLowerCase();

      if (soundName.length > 0) {
        soundNames.add(soundName);
      }
    }
  }

  return [...soundNames];
}

function readEventValue(value: unknown): PatternEventValue | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as PatternEventValue;

  if (record.s !== undefined || record.sound !== undefined) {
    return record;
  }

  if (record.value !== undefined) {
    return readEventValue(record.value);
  }

  return record;
}

function collectSoundNamesFromPattern(pattern: StrudelPattern, cps: number) {
  const events = pattern.queryArc(0, 32, { _cps: cps });
  const soundNames = new Set<string>();

  for (const event of events) {
    const value = readEventValue((event as { value?: unknown }).value);
    const candidate = value?.s ?? value?.sound;

    if (typeof candidate === "string" && candidate.trim().length > 0) {
      soundNames.add(candidate.trim().toLowerCase());
    }
  }

  return [...soundNames];
}

async function warmupSoundBanks(
  strudel: DirectStrudelModule,
  soundNames: string[],
) {
  if (
    !("getAudioContext" in strudel.webaudio) ||
    typeof strudel.webaudio.getAudioContext !== "function" ||
    !("getSound" in strudel.webaudio) ||
    typeof strudel.webaudio.getSound !== "function" ||
    !("getCachedBuffer" in strudel.webaudio) ||
    typeof strudel.webaudio.getCachedBuffer !== "function" ||
    !("loadBuffer" in strudel.webaudio) ||
    typeof strudel.webaudio.loadBuffer !== "function"
  ) {
    return {
      loadedCount: 0,
      pendingCount: 0,
      soundNames,
    } satisfies SampleWarmupResult;
  }

  const audioContext = strudel.webaudio.getAudioContext();
  const pendingLoads: Array<Promise<unknown>> = [];
  let loadedCount = 0;

  for (const soundName of soundNames) {
    const sound = strudel.webaudio.getSound(soundName) as StrudelSound | undefined;

    if (sound?.data?.type !== "sample") {
      continue;
    }

    const urls = [...new Set(flattenSampleUrls(sound.data.samples))];

    for (const [index, url] of urls.entries()) {
      if (
        typeof url !== "string" ||
        strudel.webaudio.getCachedBuffer(url)
      ) {
        continue;
      }

      pendingLoads.push(
        strudel.webaudio.loadBuffer(url, audioContext, soundName, index).then(() => {
          loadedCount += 1;
        }),
      );
    }
  }

  for (let index = 0; index < pendingLoads.length; index += SAMPLE_WARMUP_BATCH_SIZE) {
    const batch = pendingLoads.slice(index, index + SAMPLE_WARMUP_BATCH_SIZE);
    await Promise.allSettled(batch);
  }

  return {
    loadedCount,
    pendingCount: pendingLoads.length,
    soundNames,
  } satisfies SampleWarmupResult;
}

async function warmupPatternSamples(
  strudel: DirectStrudelModule,
  pattern: StrudelPattern,
  cps: number,
) {
  return warmupSoundBanks(strudel, collectSoundNamesFromPattern(pattern, cps));
}

async function resumeStrudelAudioContext(strudel: DirectStrudelModule) {
  if (
    !("getAudioContext" in strudel.webaudio) ||
    typeof strudel.webaudio.getAudioContext !== "function"
  ) {
    return;
  }

  const audioContext = strudel.webaudio.getAudioContext() as {
    resume?: () => Promise<void>;
    state?: string;
  };

  if (audioContext?.state === "suspended" && typeof audioContext.resume === "function") {
    await audioContext.resume();
  }
}

export async function getStrudelAudioContextState() {
  const strudel = await loadStrudelModule();

  if (
    "getAudioContext" in strudel.webaudio &&
    typeof strudel.webaudio.getAudioContext === "function"
  ) {
    const audioContext = strudel.webaudio.getAudioContext();
    return audioContext?.state ?? "missing";
  }

  return "unavailable";
}

export async function getStrudelRuntimeState() {
  const repl = await getStrudelRepl();

  return {
    evalError: repl.state?.evalError?.message ?? null,
    schedulerError: repl.state?.schedulerError?.message ?? null,
    started: repl.state?.started ?? false,
  };
}

export async function getCurrentStrudelCps() {
  const repl = await getStrudelRepl();

  return repl.scheduler?.cps ?? 0.5;
}

export async function getCurrentStrudelCycle() {
  const repl = await getStrudelRepl();

  if (typeof repl.scheduler?.now === "function") {
    return repl.scheduler.now();
  }

  return 0;
}

export async function ensureStrudel() {
  const strudel = await loadStrudelModule();
  await getStrudelRepl();
  await ensureStrudelScope();
  await ensureDefaultSamples();
  installStrudelLogger(strudel);
  return strudel;
}

export async function prepareStrudelAudio() {
  const strudel = await loadStrudelModule();
  await getStrudelRepl();

  if (
    "initAudioOnFirstClick" in strudel.webaudio &&
    typeof strudel.webaudio.initAudioOnFirstClick === "function"
  ) {
    await strudel.webaudio.initAudioOnFirstClick();
  }
}

export async function unlockStrudelAudio() {
  const strudel = await loadStrudelModule();
  await getStrudelRepl();

  if ("initAudio" in strudel.webaudio && typeof strudel.webaudio.initAudio === "function") {
    await strudel.webaudio.initAudio();
  }

  await resumeStrudelAudioContext(strudel);
}

export async function playStrudelCode(source: string) {
  const strudel = await ensureStrudel();
  const repl = await getStrudelRepl();
  const normalizedSource = normalizeStrudelSource(source, strudel);
  const sourceSoundNames = extractSoundNamesFromSource(normalizedSource);
  const warmup =
    sourceSoundNames.length > 0 ? await warmupSoundBanks(strudel, sourceSoundNames) : null;
  const pattern = await repl.evaluate(normalizedSource, true, true);

  if (pattern && sourceSoundNames.length === 0) {
    const cps = await getCurrentStrudelCps();
    await warmupPatternSamples(strudel, pattern, cps);
  }

  return {
    pattern,
    warmup,
  };
}

export async function stopStrudelPlayback() {
  const repl = await getStrudelRepl();
  repl.stop();
}

export function getRecentStrudelLogs() {
  return recentLoggerEntries;
}
