# Visual Synth v0.1.042 — integrated Sound Lab + musical signals

This release uses the **v0.1.040 Sound Lab as the base** and adds the v0.1.041 musical analysis *within that same page*. There is no separate Feature Lab link or page.

- Visual Synth UI, engine and controls are unchanged from 040, except that the visible version is now **v0.1.042**.
- Sound Lab retains all 040 NMF pattern inspection, five independent ON/OFF pattern buttons, ORIGINAL / PATTERN MIX / ALL PATTERNS / NONE, playback and export.
- The new **04 / MUSICAL SIGNALS & COMPONENT MIXER** section lives *below* the existing Sound Lab panels.
- It presents v41-derived 16 kHz musical analysis: harmonic/percussive energy, low/mid/high attacks, 12 pitch classes, tonal movement, brightness, spectral change and slower activity/change.
- Its five audio component buttons are independent ON/OFF switches. Hearing any combination requires **FEATURE MIX**, integrated into the same top transport. Choose ORIGINAL or PATTERN MIX to compare against the source or NMF; selections persist.
- No automatic loudness matching. Harmonic/percussive and low/mid/high are two **overlapping** decompositions; playing all five can double-count sound and clip. Neither separation identifies instruments.
- Both analyses run locally for the same 30-second window. Musical analysis starts automatically once NMF finishes. The feature worker can reconstruct each selected component for playback.
- The existing results JSON includes musicalFeatures when ready; the diagnostics ZIP includes their data and component WAVs when ready.
- Workers have versioned URLs to avoid confusing old GitHub Pages content with the new files.

## Deployment

Upload the six files at the ZIP root into the same GitHub Pages directory (replacing existing files). Open `index.html`, click SOUND LAB, then use the original mixer and the new bottom section. No `feature-lab.html` is needed. In a browser with a stale cache, a hard refresh may be necessary.

## Package

`index.html`, `analysis-worker.js`, `event-lab.html`, `event-lab-worker.js`, `feature-lab-worker.js`, `README.md`.
