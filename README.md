# Visual Synth v0.1.033

- Compact 734px synthesis panel beside the 594px input mixer on wide displays.
- Six output-track knobs/ON/EDIT are in a horizontal row at top of synthesis section, not a separate vertical section.
- One 6px seam and existing knob/fader styling retained.
- Pitch extraction tuned for a clearer bass and short upper synth notes: 4096-sample YIN frame, relaxed voiced gating, wider melody spectrum, shorter note threshold, short-gap joining; voice grouping still provisional.
- Important: source separation by instrument is **not** provided by MultiPitchMelodia; melody A–C remain approximate pitch streams, not guaranteed distinct synth parts.
- Files: index.html and analysis-worker.js. Upload both together.
