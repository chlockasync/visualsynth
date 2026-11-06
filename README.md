VISUAL SYNTH v0.1.031

UPLOAD TO GITHUB PAGES
Upload both index.html and analysis-worker.js to the same site directory. Open the page via HTTPS. Replace both files on updates and force reload if the visible version is stale.

FIRST PASS: MUSICAL VOICES / ARRANGEMENT
Five synthesiser inputs: BEAT, BASS, MELODY A, MELODY B, MELODY C.
- Beat: Essentia RhythmExtractor2013 beat timestamps, with loudness-gated pulses to avoid visual activity in silence.
- Bass: Essentia probabilistic YIN on a bass-filtered version of the audio.
- Melodies A-C: Essentia MultiPitchMelodia detects simultaneous frequencies; a simple continuity/register tracker tries to preserve three distinguishable lines. It does NOT identify or separate instruments. Notes may be missing, misassigned, or duplicated.
- The timeline shows the waveform, estimated beats, note spans, and a derived arrangement activity curve with heuristic BUILD/BREAK markers, plus a full-song overview at the bottom.
- The original playback, resize controls, track synthesis and JP-style channel controls remain.
- Only ON input channels can be selected in SOURCE / ROUTING. Input LEVEL or MUTE affects synth send; OFF also hides its note lane and input meter.
- Audio and analysis execute client-side. External JS/WASM libraries are fetched from CDNs by the page, per previous versions; MP3 content is not uploaded to those libraries.

LIMITATIONS / TEST STATUS
The layout, MP3 file selection/decoding, and browser routing passed Chromium smoke tests. A simulated Essentia API integration test successfully returned five signals and note lanes. The real Essentia WASM multi-pitch algorithm could NOT be executed within the current environment because the CDN is unreachable here. It will require testing in the hosted app with your real music. Multi-pitch extraction can be slow on an older laptop. Melody A-C are provisional pitch-line hypotheses, NOT separated instruments. BUILD/BREAK labels indicate arrangement activity changes, not formally recognised song sections.

Next: Test against the supplied JP20261102c.mp3 and inspect whether the three lines correspond to identifiable audible parts. If not, we'll need user-guided voice grouping and/or stem separation rather than pretending automatic pitch matching equals instrument isolation.
