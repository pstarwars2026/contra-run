# Validation and manual acceptance

## Automated checks

Run `npm ci`, `npx playwright install chromium`, and `npm test` from the repository root. The existing GitHub Actions workflow runs the same suites on pushes to main and pull requests.

`test_chords.js` uses Playwright keyboard events against the actual browser game and checks that the player becomes airborne while bullets are produced. It covers left/right Control, both press and release orders, movement while firing/jumping, and repeated short Space presses while Control stays held. Synthetic-event cases are explicitly labeled: they model missed Control events and altered key values rather than claiming to emulate hardware or OS interception.

The regression suite initially exposed five failures: an already-held Control modifier was not recovered, a keyboard Jump was suppressed by an existing mouse Jump owner, a changed key value could override physical Space, focus loss could rearm movement via repeat, and 390-pixel portrait controls overflowed. The normal browser-generated Control + Space chord already passed before these fixes. These observations narrow the evidence; they do not establish which event sequence occurred on the reporter's physical keyboard.

The input suite also checks source ownership, key releases, focus/visibility loss, pause/resume, and pointer cancellation. The gameplay and campaign suites cover movement, combat, weapons, bridges, swimming, respawn, bosses, victory, and all three zones. Audio checks inspect actual context suspension and music gain in addition to theme names.

## Human play check

Before claiming a device-specific input problem is resolved, play on that device. Hold left Control and repeatedly press Space while moving, reverse the press/release order, and repeat with right Control. Hold on-screen Fire or Jump while using the keyboard. Switch tabs mid-hold, return, resume, and confirm the game starts from neutral input and reacts to fresh presses.

Listen through a stage and boss transition at a comfortable level. Compare music at 65%, lower settings, and zero; verify effects remain audible with music at zero. Browser state tests are not listening-quality approval.

On a touch device, check portrait and landscape, simultaneous direction/fire/jump, pointer cancellation, Pause/Resume, and notch/home-indicator clearance. Automated viewport bounds do not substitute for physical touch testing.

## Screenshots

`npm run screenshots` refreshes the title, gameplay, pause, and portrait screenshots in `docs/images`. Inspect the generated images before publishing them; successfully saving a screenshot alone is not a visual review.
