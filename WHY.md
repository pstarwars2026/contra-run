# Why this game exists

ContraRun started as a small browser experiment: can the immediacy of a classic run-and-gun game survive a modern 2.5D presentation without turning into a large engine project?

The goal is a game that starts instantly, feels responsive, and remains understandable enough that another developer can clone it, run it, change it, and verify the result. That is why the release keeps its runtime self-contained, uses local browser assets, and treats input reliability as a tested feature rather than an assumption.

The project also serves as a compact playground for browser game engineering: fixed-step simulation, Three.js rendering, procedural audio, touch controls, boss state machines, collision logic, and end-to-end browser tests all live in one approachable repository.

The direction is simple: preserve the arcade feel, improve the craft, and make each cleanup leave the game easier to understand and safer to modify.
