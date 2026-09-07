# Changelog

## 1.2.0 — 2026-09-07

Final v1 controls and usability pass. Three.js remains the rendering engine; the three-zone campaign and original MIDI-style arrangements are retained.

### Controls

- Recover firing when Space arrives with Control already held but the game's Control keydown was missed. A later modifier snapshot also releases a missed Control keyup.
- A fresh keyboard Jump works while mouse Jump remains held. Each physical press owns its action independently.
- Prefer physical key codes over changed key values, and preserve other held sources when releasing a key.
- Automatically pause on focus loss or a hidden tab. Ignore stale repeat events after input clearing, and resume from neutral controls.
- Add held-control feedback, on-screen Pause/Mute, an explicit Resume panel, and Esc as a pause shortcut.

### Sound and layout

- Add independent music volume, including percussion, with a quieter 65% default. Setting music to zero retains sound effects.
- Keep pause, mute, and focus loss independent: unmuting a paused game or resuming a muted game stays silent.
- Start scheduled drum oscillators at their intended audio time, and avoid scheduling a burst after a delayed audio timer.
- Fit controls to narrow portrait screens, retain safe-area padding, improve title readability, and separate the boss bar from the main HUD.

### Repository

- Add a dedicated Control + Space gameplay regression suite to the default tests and existing CI.
- Expand audio checks to inspect real AudioContext state and music gain.
- Update control documentation, troubleshooting, validation boundaries, and reproducible screenshots.

Browser automation verifies delivered events and resulting gameplay. Physical-keyboard and OS shortcut behavior still requires a human play check; this release does not claim an OS-level reproduction of the reported issue.
