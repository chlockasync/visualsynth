VISUAL SYNTH v0.1.032

Upload index.html and analysis-worker.js to the same GitHub Pages folder and force refresh.

ANALYSIS FIX
- Essentia PitchYinProbabilistic argument 5 (outputUnvoiced) now receives the required string "zero" instead of the incorrect boolean false. The earlier type caused "Cannot pass non-string to std::string" before the bass/melody analysis could proceed.
- Bass and multi-pitch analysis errors now identify the stage.

LAYOUT
- The five input channels now fit the panel exactly, with no unused horizontal space.
- All six visual output tracks and the synthesis controls are visible beside the input controls on wide screens.
- Input and synthesis panels share a single 6px border; each panel stops at its own content height. On narrower windows (<=1250px), the synthesis controls stack below.
- The INPUT and SYNTHESIS navigation buttons scroll to the corresponding section, without hiding either one.
- Existing monitor, fader, knob and synthesiser behaviour preserved.

VERIFICATION
- JS syntax checks passed.
- Browser screenshots and functional layout checks passed at 1920, 1440 and 1100 widths.
- Uploaded MP3 file decodes and reaches library-loading stage without page errors.
- Worker integration mock verifies the YIN call receives the correct string, returns the five sources, notes and arrangement curve.
- Real CDN-loaded Essentia WASM was not executable in this environment. The actual five-source analysis needs testing on the hosted app.
