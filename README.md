# Visual Synth v0.1.038: Listen to isolated sound patterns

This release builds on v0.1.037. The main synthesiser, five input channels, existing sound-pattern analysis, panel borders and control geometry are unchanged.

## Sound Event Lab

1. Load your MP3 and analyse a passage (up to 30 seconds).
2. Under **RECURRING SOUND PATTERNS**, click **ISOLATE AUDIO** on Pattern 1, 2, 3, 4 or 5.
3. Click **PLAY** to hear only that approximate pattern, or switch to another pattern while playing.
4. Click **FULL MIX** above the timeline to hear the original recording at the same point.
5. The analysis curves stay visible and the playhead remains aligned. Speed controls still work.

## What isolation means here

The analyser learns five non-negative spectral components. For each component, Sound Lab reconstructs a **mono diagnostic preview** by applying the component's time-varying spectral mask to the original excerpt's FFT and using inverse FFT overlap-add synthesis. These previews cover approximately 55 Hz to 3.5 kHz at 11,025 Hz sampling and may sound muffled. Quiet components are amplified for listening comparisons.

**These are not clean instrument stems.** A single sound can appear in multiple components; a component can contain multiple sounds; leakage and musical artefacts are expected. This feature is for identifying which musical elements correlate with the activity curves, not for music production or final audio export. FULL MIX always uses the original full-resolution recording.

## Technical checks

- Worker NMF and reconstruction tested using a 30-second excerpt of the supplied JP20261102c.mp3.
- Reconstructed waveforms for all five components were non-silent and different from one another.
- Chromium in-memory test: MP3 loading, analyse, isolate Pattern 1 and Pattern 2, play, return to full recording, and playhead/time alignment.

Upload these five files to your GitHub Pages root: `index.html`, `analysis-worker.js`, `event-lab.html`, `event-lab-worker.js`, and `README.md`.
