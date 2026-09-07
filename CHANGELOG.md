# Changelog

## 1.3.0 — 2026-09-07

A focused gameplay, readability, and music upgrade to the existing Three.js game.

### Fairer play and controls

- Resolve checkpoint positions per zone onto permanent ground, with clear headroom and a tile of safe ground on either side. Collapsed bridges cannot become respawn surfaces.
- Add checkpoint flags and a clear confirmation after crossing and landing.
- Fix straight-up airborne aim while retaining deliberate diagonal aim with a horizontal direction.
- Let a fresh pointer Dash activate while a keyboard Dash source remains held; show the cooldown on the on-screen button.
- Preserve score, the next extra-life threshold, and earned lives between zones and through New Game+. Replenish lives to at least three on a zone clear.
- Prevent a spent bullet from damaging both an enemy and a boss node, remove spent shots immediately, and retire hostile projectiles above the viewport or after ten seconds.

### Graphics, pause, and sound

- Fit the complete playfield to its native proportions in portrait and landscape, removing stretched characters without cropping visible hazards.

- Add dark outlines and bright centers to hostile shots for contrast against the stage scenery.
- Advance camera shake, messages, warnings, and intro timers on the simulation clock. Pausing freezes these effects and world animation; rendering more frames does not speed them up.
- Replace short repeated music loops with four arrangement passes: melody, bell response, quiet interlude, and return. Keep the original zone melodies and soft voices.
- Save music volume, mute, and reduced screen effects locally, with validated values and a fallback when storage is blocked or corrupt.
- Respect the system reduced-motion preference by default. Reduced effects removes camera shake and player flashing, and makes the contact warning steady. Standard warnings pulse more slowly and general messages no longer blink.

### Verification

- Add `test_polish.js` to the default test command and existing pull-request CI. It contains 17 checks for the new behavior, including full offline renders of all five original scores with audible output and no clipping.
- Retain the existing keyboard, mixed-pointer, Control + Space, campaign, layout, combat, and audio-state suites.
- Keep the boss camera assertion at full precision, avoiding a false failure when a valid position just beyond the threshold rounds back to the threshold.
- Refresh documentation and reproducible screenshots. Automated audio checks measure output and scheduling; they do not replace subjective listening or physical-device play.

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
