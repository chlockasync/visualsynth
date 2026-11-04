# Visual Synth v0.1.023

This version updates the existing 13-channel input mixer and timeline without replacing the audio analysis engine.

## Changes

- Version number moved to the right of the MUSIC-VISUAL SYNTHESIS subtitle in the header.
- An enabled (ON) channel is available to both the input monitor and visual synth send. Switching ON off hides the timeline trace, sets its live meter to zero, and suppresses the synth send. MUTE still suppresses only the synth send; LEVEL controls only the synth send's amount.
- Bottom overview strip inside the input timeline now represents the entire loaded track. Click or drag it to navigate anywhere in the music, including outside the zoomed view. Click/drag the graph above to seek within the current visible window; dragging beyond its sides continues seeking.
- Removed the redundant descriptions and status text above and below the 13-channel mixer.
- The input-channel panel now stops at the right edge of the 13th channel rather than filling the whole screen. On narrower windows the channels remain horizontally scrollable.

## Deployment

Upload `index.html` and `analysis-worker.js` together to the same GitHub Pages directory. Hard-refresh if a cached older version appears. The visible version should read `v0.1.023`.

Analysis is performed in your browser. The existing Essentia.js and Meyda runtime scripts are downloaded from a CDN; the music stays local. This release doesn't change those libraries or the analysis algorithms.

## Verification

Chromium rendering and startup were checked at 1920px and 1280px width. Automated interaction tests verified channel ON / MUTE routing and meter behaviour, and that the timeline's full-track overview can seek outside its current 8-second window. Full MP3 analysis with the external libraries was not rerun in this version.
