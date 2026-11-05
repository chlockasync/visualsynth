Visual Synth v0.1.029 — music-only rendering + fundamental-frequency tracking

- Builds on v0.1.028; retains the approved interface geometry and six-track workflow.
- Replaces FFT peak selection for bass/upper contours with Essentia probabilistic YIN (filtered bass) and predominant MELODIA (filtered upper), using resampled 22.05-kHz analysis copies.
- Uses confidence/voicing gates and leaves missing notes silent rather than holding fake pitches.
- No independent geometric background is drawn by any output track. All visible strokes are conditional on positive audio-derived source samples and their amplitudes scale with the send level.
- Turning both selected sources off, muting their sends, setting their level to zero, or setting track drive/level to zero makes that track fully transparent. Historical source content persists up to the configured history window, which itself is sampled only from the audio.
- Original decoded audio and playback quality unchanged.
- Essentia/Meyda libraries remain CDN-delivered like v0.1.028. For GitHub Pages, upload BOTH index.html and analysis-worker.js; the worker URL is versioned.

Pitch extraction is estimation, not true source separation. The very first full live Essentia pass will still need validation in the user's browser: this environment has no CDN access.
