VISUAL SYNTH v0.1.035 — SOUND EVENT LAB

DEPLOYMENT
Upload all four files to the same GitHub Pages directory:
  index.html
  analysis-worker.js
  event-lab.html
  event-lab-worker.js

The established Visual Synth app and its Essentia/Meyda pitch-analysis pipeline
remain unchanged except for a visible SOUND LAB link and the version number.

EXPERIMENT
1. Open Visual Synth, then click SOUND LAB in the Music Arrangement header.
2. Choose an MP3 again (this separate experimental page cannot automatically
   access the file opened in the main page).
3. Select a starting time; ANALYSE 30 s.
4. Inspect ONSETS and five NMF PATTERN activity timelines.
5. Click a gold onset in the top lane; other events with comparable attack
   signatures appear in cyan under MATCHES. Adjust SIMILARITY.
6. Try later sections to see whether an identifiable instrument consistently
   appears in one pattern. Export results JSON for further analysis.
7. Optional comparison: use Spotify Basic Pitch separately on that same MP3,
   download MIDI, then import the MIDI in SOUND LAB. Its note events appear
   in a purple lane. If the file was transcribed from the excerpt rather
   than from the full song, set MIDI time offset to the excerpt's start.

METHODS
- Standard short-time Fourier transform, log-frequency spectrum
- Positive spectral flux + adaptive onset peak picking
- Euclidean non-negative matrix factorisation (NMF) with multiplicative updates
- Attack-spectra matching by cosine similarity, optional small pitch shift
- Standard MIDI File (type 0/1) note events for optional third-party comparison

LIMITATIONS
- NMF patterns are NOT instrument separation; one instrument may occupy
  several patterns, or several instruments may occupy one.
- An onset candidate does not guarantee a musical note attack.
- Similar attack spectra do not prove that two events came from the same instrument.
- Basic Pitch runs separately, NOT inside this build. It is an optional comparison
  by MIDI import, not one of the app's current algorithms.
- The experimental results are not routed to the five main synthesis inputs yet.
- The experiment analyses up to 30 seconds per run to keep CPU usage modest.
- Both pages process selected audio locally; any use of an external Basic Pitch
  website is separate and subject to that service's own practices.

TESTING
- Loaded JP20261102c.mp3 and completed 30 seconds of NMF/onset analysis in Chromium.
- 119 candidate onsets and 5 distinct component timelines found in this test.
- Selecting events, similarity slider, alternate excerpts and MIDI import tested.
- Main app opened in Chromium without a startup error; main pitch algorithms
  were not re-run in this release.

The design and original 13/five input controls, hardware knob/fader geometry,
panel borders, six visual output tracks, playback and monitor sizing are not
redesigned by this experiment.
