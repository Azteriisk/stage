declare module "@strudel/web" {
  export type StrudelPattern = {
    queryArc(
      begin: number,
      end: number,
      controls?: Record<string, number>,
    ): unknown[];
  };

  export type WebaudioRepl = {
    evaluate(code: string, start?: boolean, hush?: boolean): Promise<StrudelPattern | undefined>;
    setPattern(pattern: StrudelPattern, start?: boolean): Promise<unknown>;
    stop(): void;
    setCps(value: number): void;
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

  export type StrudelAudioContext = {
    state?: string;
  };

  export class Pattern {
    static prototype: Record<string, unknown>;
  }

  export const soundMap: Map<string, unknown>;
  export function getSound(name: string): unknown;
  export function getCachedBuffer(url: string): unknown;
  export function setLogger(
    logger: (message: unknown, type?: unknown, meta?: unknown) => void,
  ): void;

  export function initStrudel(options?: {
    prebake?: () => unknown;
    miniAllStrings?: boolean;
    sync?: boolean;
  }): Promise<WebaudioRepl>;

  export function webaudioRepl(): WebaudioRepl;
  export function evaluate(code: string, autoplay?: boolean): Promise<StrudelPattern | undefined>;
  export function getAudioContext(): StrudelAudioContext | undefined;
  export function getCps(): number;
  export function initAudio(): Promise<unknown>;
  export function initAudioOnFirstClick(): Promise<unknown>;
  export function loadBuffer(
    url: string,
    audioContext: unknown,
    label?: string,
    index?: number,
  ): Promise<unknown>;
  export function samples(
    sampleMap: string | Record<string, unknown>,
    baseUrl?: string,
    options?: Record<string, unknown>,
  ): Promise<unknown>;
  export function setPattern(pattern: unknown, start?: boolean): Promise<unknown>;

  export function hush(): void;
}
