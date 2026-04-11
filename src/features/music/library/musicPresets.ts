export type MusicPreset = {
  id: string;
  name: string;
  description: string;
  source: string;
};

export const musicPresets: MusicPreset[] = [
  {
    id: "good-times",
    name: "Good Times",
    description: "Reference Strudel example currently used to test REPL parity inside stage.",
    source: `// "Good times"
// @license CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
// @by Felix Roos

const scale = cat('C3 dorian','Bb2 major').slow(4);
stack(
  n("2*4".add(12)).off(1/8, add(2))
  .scale(scale)
  .fast(2)
  .add("<0 1 2 1>").hush(),
  "<0 1 2 3>(3,8,2)".off(1/4, add("2,4"))
  .n().scale(scale),
  n("<0 4>(5,8,-1)").scale(scale).sub(note(12))
)
  .gain(".6 .7".fast(4))
  .add(note(4))
  .piano()
  .clip(2)
  .mul(gain(.8))
  .slow(2)
  .pianoroll()`,
  },
  {
    id: "saw-chords",
    name: "Saw Chords",
    description: "Simple harmonic sawtooth phrase for shader routing.",
    source: `note("c2 eb2 g2 c3")
  .slow(2)
  .s("sawtooth")
  .gain(0.8)`,
  },
  {
    id: "metal-pulse",
    name: "Metal Pulse",
    description: "Percussive pulse using sample sounds.",
    source: `sound("bd ~ metal ~")
  .fast(2)
  .gain("0.9 0.4 0.7 0.3")`,
  },
  {
    id: "bright-arp",
    name: "Bright Arp",
    description: "Faster melodic pattern for driving motion-heavy shaders.",
    source: `note("<c4 eb4 g4 bb4>")
  .fast(4)
  .s("triangle")
  .gain(0.55)`,
  },
];
