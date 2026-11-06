# Visual Synth v0.1.040: Independently mix isolated sound patterns

Sound Lab now allows any combination of NMF pattern audio to play together. The five pattern buttons are independent ON/OFF controls rather than mutually exclusive solo selections. The original main synthesiser is unchanged.

## Comparing patterns

1. Load a track in Sound Lab, set the starting time, and select **ANALYSE 30 s**.
2. Enable any combination of pattern cards using **OFF · ADD** / **ON · REMOVE**.
3. Press **ALL PATTERNS** to hear all five (or the chosen number) mixed together; **ORIGINAL** to hear the original recording; **PATTERN MIX** to return to the same selected combination. **NONE** clears the reconstruction.
4. Pattern selections are retained when you switch to ORIGINAL, so you can switch back easily. Playback position and speed are preserved during a source switch.

## Important audio fidelity information

The reconstructed mix uses the same 11,025 Hz mono audio extracted by the NMF, with soft masks covering its limited 55–3,500 Hz analysis region. Each pattern's individual listening gain is **reversed** before summing, to preserve original relative contributions. There is **no automatic loudness matching**, and a restored sum will not have the original recording's full bandwidth or stereo image. As with the prior Sound Lab, these are frequency components, not clean instrument stems.

All processing remains local. The package contains `index.html`, `analysis-worker.js`, `event-lab.html`, `event-lab-worker.js`, and `README.md` for GitHub Pages.
