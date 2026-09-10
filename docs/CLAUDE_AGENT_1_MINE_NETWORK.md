# Claude Opus 4.8 work package 1 — Mine network

You are working alongside Codex on branch `codex/mystery-expansion` of
`ab19902020/Silo-`. Read `README.md`, `WORLD.md`, `docs/reconstruction.md`,
`dist/src/underground.js`, `dist/src/kit.js`, `dist/src/physics.js`, and the
world/void tests before editing.

## Goal

Replace the one straight mine corridor with a substantial, legible,
interconnected mine network. This is an expansion of a working Three.js game,
not a rewrite. Preserve every existing route, return destination, collision,
lighting rule, and Explore-mode capability.

## File ownership

Create and own only:

- `dist/src/mine-network.js`
- `tests/mine-network.test.mjs`
- `docs/mine-network.md`

Do not edit `underground.js`, `main.js`, `story.js`, `world.js`, UI files,
`.openai/hosting.json`, or any existing test. Codex will perform the three-line
integration after merging your module. Do not invoke Sites tooling, publish,
deploy, or alter Git remotes.

## Export contract

Export `buildMineNetwork(materials, options = {})`. Return:

```js
{
  root, solids, walkways, interactions, lights,
  destinations, chambers, bounds, update
}
```

- `root`: one `THREE.Group`, origin at the current mine anchor. Codex will
  position it at world `(105, 48, 0)`.
- Collider and walkway coordinates must be local to that anchor and must carry
  `local: true`; Codex will translate them during integration.
- Preserve an unobstructed spawn at local `(0, 0, -29)` and the return action
  to Level 144 there.
- `destinations` must include stable IDs for `mine-junction`, `mine-pump`, and
  `mine-deep-face` with local position and yaw.
- `update(dt, time, playerPosition, quality)` must be safe when omitted from the
  render loop and must never allocate every frame.

## Network design

- A timbered arrival gallery enters a central switch chamber.
- At least three routes form at least one real loop; no decorative fake doors.
- Include an ore face, abandoned pump chamber, collapsed branch, ventilation
  gallery, tool cache, and a quiet optional fan chamber.
- Use environmental wayfinding: painted route bands, numbered timbers,
  airflow cloth, cable colours, chalk arrows, and distinct sound/lighting
  character. Do not use floating quest markers.
- Include two restrained Easter eggs whose wording is original and whose
  provenance is described honestly in `docs/mine-network.md`. Do not bundle
  show frames, logos, dialogue, or copyrighted text.
- Every traversable route needs floor support and collision clearance for a
  0.3 m-radius, 1.78 m character. Avoid steep ramps that exceed the existing
  controller's step assumptions.
- Reuse `Kit`, merged/instanced geometry, and shared materials. Target fewer
  than 45 additional mesh batches and fewer than 350k triangles. Lights must be
  fixed artificial practicals; no directional light and nothing follows the
  player.

## Tests and handoff

Tests must prove route connectivity, one genuine loop, supported destinations,
bounded geometry, unique IDs, and absence of directional lights. Run
`npm test` and `npm run validate`. Commit only your owned files, then report the
commit SHA and the integration notes. Do not merge to `main`.

