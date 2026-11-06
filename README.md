# Visual Synth v0.1.039: Export all isolated patterns for analysis

This focused Sound Lab update adds **EXPORT AUDIO + ANALYSIS ZIP**. It keeps the existing five NMF patterns, the working synthesiser, analysis worker, rendering controls and established panel styling unchanged.

## How to export

1. Open **SOUND LAB** from Visual Synth. Load your track and choose a 30-second excerpt.
2. Click **ANALYSE 30 s** and let it finish.
3. Click **EXPORT AUDIO + ANALYSIS ZIP** in the Experiment section.
4. Upload the downloaded ZIP to ChatGPT to examine the exact isolated WAVs and accompanying matrices.

The generated ZIP includes the full-quality reference excerpt (WAV), a mono version at the analysis sample rate, **all** isolated pattern WAVs, analysis.json (NMF spectra, frame activity, onset times, event spectral fingerprints, gain metadata), an optional spectrogram matrix and README.txt.

The separate **EXPORT RESULTS JSON** button still works as before. The isolated WAV files are lower-bandwidth mono diagnostic reconstructions and individually gain-adjusted; they are **not** true instrument stems.

All processing and export occur on your device. No audio is sent to a server. ZIP creation uses built-in browser APIs, not an external dependency.

Upload the same 5 files to GitHub Pages: `index.html`, `analysis-worker.js`, `event-lab.html`, `event-lab-worker.js`, `README.md`.
