# Visual Synth v0.1.021 — 13 Input Channels

This version replaces the old Analysis Controls and Live Source Signals dashboard with a single 13-channel input mixer. It retains local MP3 playback, time-aligned analysis, timeline scrubbing, adjustable monitor heights, and the 16:9 output preview.

## Install / deploy

Upload **both** `index.html` and `analysis-worker.js` from this ZIP to the same folder on GitHub Pages, replacing the previous versions. The page displays **v0.1.021** beside VISUAL SYNTH. Hard refresh if you still see an older version. This version fetches Essentia.js and Meyda library scripts from CDN mirrors; the MP3 itself is processed locally in the browser.

## 13 input channels

- Timing: **BEAT**, **PHASE**, **ONSETS**, **STRENGTH**
- Low: **BASS PITCH**, **BASS MOVE**
- Upper: **UPPER PITCH**, **UPPER MOVE**
- State: **LOUDNESS**, **INTENSITY**, **BRIGHTNESS**, **ACTIVITY**, **TEXTURE**

**BASS PITCH** and **UPPER PITCH** are *approximate dominant spectral pitch contours in two registers*, not isolated or confidently transcribed instruments. **BASS MOVE** and **UPPER MOVE** represent changes in those contours. The two register features are derived from the spectra extracted by Meyda, without adding a computationally heavy source-separation model.

## Channel controls

- **ON**: enable/disable the processed channel for output.
- **TRACE**: show/hide the processed channel trace in the input monitor; independent of ON.
- **LEVEL**: gain, 0–200%.
- **GATE**: suppress values below a chosen threshold.
- **ATT** and **REL**: envelope response to upward and downward changes.
- **LPF**: low-pass cutoff *on the modulation/control signal*, not a filter on the audible MP3.
- **WIDTH**, **RATE**, **CURVE**, or **RANGE**: source-specific response control.

Drag knobs vertically to adjust, or focus and use arrow keys. Settings change the visual diagnostic output and input traces immediately. MIDI/modulation routing and the actual visual synthesis modules are still future work.

## Test status

Browser UI at 1920, 1366 and 980 px: verified; all 13 strips render, switches and knobs respond. MP3 selection and preparation: verified. The worker's 13-signal output contract: tested with simulated Essentia/Meyda objects. Full Essentia/Meyda analysis on the uploaded user's own track was **not** independently tested in this environment, so this version still requires a real-track trial.
