# Visual Synth Sound Lab experiment v0.1.041

This update adds an **independent Musical Feature Lab experiment**, without changing the working Visual Synth application or its input/rendering architecture.

## Using the new experiment

1. Upload every file in the ZIP to the same directory on your GitHub Pages site.
2. Open the existing SOUND LAB page (`event-lab.html`). Click **FEATURE LAB: MUSIC SIGNALS** at the top.
3. In `feature-lab.html`, choose your MP3 and click **ANALYSE 30 s**. A recording longer than 122 seconds defaults to 90–120 seconds.
4. Play the passage and compare the **low/mid/high attacks**, **harmonic/percussive**, **12 pitch classes**, **tonal movement**, **brightness**, **spectral change**, and **slower activity/change** tracks.
5. Use **ORIGINAL / HARMONIC / PERCUSSIVE / LOW / MID / HIGH** to hear the relevant underlying audio components. They are diagnostic source-audition options, **not identified instruments**.
6. **EXPORT FEATURE DATA** creates JSON for quantitative inspection and next-round comparisons.

## Methods and limits

- Standard 16 kHz mono STFT (1024 samples, 256-sample hop), median-filter harmonic-percussive separation with complementary soft masks, multiband positive spectral flux, octave-folded chroma, spectral centroid and slow feature-change estimates.
- Analyses are computed in a local Web Worker, with no server or model training. No neural-network model is installed or invoked.
- Analysed bands: low (<240 Hz), middle (240–1600 Hz), high (>1600 Hz).
- Component WAV previews are made locally by overlap-add reconstruction and retain the **original relative audio level**, not solo boosts. They are 16 kHz mono; the ORIGINAL control plays the uploaded recording.
- These measurements are **candidate signals**, not a musical-voice detector. The three onset bands can respond to the same event because a single sound has harmonics in several frequency ranges.
- Chroma and novelty track changes in total musical content, **not** three isolated melodies or objectively labelled builds/breaks.

## Files

- `index.html` — **byte-identical** to v0.1.040; intentionally not updated.
- `analysis-worker.js` — **byte-identical** to v0.1.040.
- `event-lab.html` — existing Sound Lab; only a navigation link to Feature Lab added.
- `event-lab-worker.js` — **byte-identical** to v0.1.040.
- `feature-lab.html` and `feature-lab-worker.js` — the new independent experiment.

Validated in Chromium on JP20261102c.mp3 at 90–120 seconds: MP3 decoding, feature extraction, timeline, source switching, playback position, JSON export and layout at 1100/1440/1920 px. Harmonic + percussive PCM reconstruction verified against 16 kHz analysis audio.
