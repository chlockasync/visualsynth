# Visual Synth v0.1.036 — Smooth Sound Lab playback

Upload all 5 files to the same GitHub Pages folder. The existing Visual Synth synthesis and analysis code is preserved; only Sound Event Lab playback presentation is changed.

Changes:
- Sound Lab draws the complete event graph only when data, selection, window, or size changes.
- A separate gold playhead overlay follows HTMLAudioElement.currentTime via requestAnimationFrame, not timeupdate redraws. The audio clock remains the reference.
- Playback time label updates with the animation loop; 30-second excerpt boundary is enforced.
- Added 0.5×, 0.75×, 1× and 1.25× Sound Lab playback speed options for comparison.
- Reduced a redundant repeated maximum calculation inside spectrogram plotting.

This does not change the detection algorithms, source routing, main instrument styling, or audio quality.
- Playhead and elapsed-time readout update independently of canvas redraws and support centisecond precision.
- Play button changes to PAUSE while playing; click again to pause.
