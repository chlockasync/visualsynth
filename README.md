# Visual Synth v0.1.034 – diagnostic pitch-view build

This updates v0.1.033 without changing the analysis algorithms, six-track synthesis, source controls or settled JP-style geometry.

- RAW PITCH toggles the input monitor between arrangement and raw detector diagnostics (same current window and scrub behaviour).
- RAW view shows raw simultaneous pitch candidates, raw YIN bass estimates, an approximate log-frequency spectrogram computed from the existing Meyda features, and assigned notes on a common pitch scale. The spectrogram is diagnostic, not an instrument source.
- EXPORT saves time-stamped pitch candidates and resulting assigned notes as JSON, for comparison with the actual audio.
- Raw pitch measurements and spectrogram use transferred typed arrays, so no second FFT or repeat pass is needed.
- Both buttons appear in the input monitor header.

**Important:** Essentia WASM analysis still needs actual-browser verification. This version does not claim reliable instrument separation or fix missing notes. It makes the failures observable.

Deploy `index.html` and `analysis-worker.js` together on GitHub Pages.
