# Visual Synth v0.1.022 — channel routing and compact mixer

Based on the v0.1.021 analysis and player. Upload **index.html** and **analysis-worker.js** to GitHub Pages together.

**Channel routing**
- **ON** controls only whether the processed input appears as a separate trace in the input monitor. It does *not* mute the synth bus.
- **LEVEL** sends the processed input to the visual synthesiser. At zero, synth send is zero; higher settings amplify and cap the 0–1 control signal.
- **MUTE** silences the channel send to the synthesiser, never the monitor trace or channel activity meter.
- **RESET** restores ON, MUTE, LEVEL, GATE, ATT, REL, LPF, and the source-specific dial to the initial defaults for that channel.
- All 13 channel strips have a fixed **92px** width, leaving unused width in the rack rather than stretching each strip. The rack scrolls horizontally on narrower windows.

The visual output remains a **diagnostic** signal responder, not the finished synthesiser. Music analysis libraries and monitor layout are otherwise unchanged.
