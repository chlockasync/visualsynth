# Visual Synth v0.1.027 — First functional visual synthesis

Deploy `index.html` and `analysis-worker.js` together to GitHub Pages.

This build keeps the v0.1.026 input monitor, analysis mixer, controls, and approved border/fader geometry. The SYNTHESIS tab now provides six independent output tracks with configurable source routing, four mathematically generated spatial expressions, shape/motion/colour controls, and an initial track-combination stage.

Music is decoded and analysed in your browser; Essentia.js/Meyda are fetched from CDN by the existing analysis code.

Recording/export, modulation matrix, saved patches, and advanced visual effects are not yet implemented. The renderer is an initial Canvas 2D implementation capped to 1280 × 720 to protect laptop performance; active track count and visual complexity affect performance.
