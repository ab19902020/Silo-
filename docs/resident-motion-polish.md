# Resident motion and story reliability

This pass starts from `b85f017` and preserves the latest creator, wardrobe,
chapters, conversations and captured gait work.

- Seated and reading poses solve both ankles against the floor. The pelvis
  remains at the chair's fixed height, so stature no longer makes feet hover
  or sink. Walking, stair planting and the opening performance are retained.
- Motion samplers reuse arrays owned by each actor. Joint rotation reuses
  quaternions and cached inverse rest transforms; separate actors never share
  mutable pose outputs.
- Generated residents use conservative object-space culling spheres. They
  contain the animated skin in idle, walking, running, work, conversation,
  sitting, jumping and climbing. Cleaning suits retain their cinema exemption.
  No per-frame full-mesh CPU skinning is needed to calculate bounds.
- Porter simulation reuses its previous route sample when the route clock is
  unchanged. It still advances every frame, including remote deliveries, and
  respects conversation and opening pauses. Explicit clock changes resample.
- Named residents get enough capacity even after the lowest night crowd budget
  deducts porters. Selecting a cast avatar also cannot remove the current
  required story contact. This treats the selection as a likeness, preserving
  the written story role; free roam continues to hide the selected duplicate.

## Verification

`npm test`: **315 passed**, including the complete world/collision/story route,
new chapter branches, terminal discovery, relic collection, pipe sequence and
ending. New regression coverage checks seated ankles at 1.55, 1.75 and 1.95 m,
all skinned vertices against culling bounds, independent motion buffers, low
crowd capacity, and the actual Billings interaction with Billings selected.
`npm run validate`: 220 runtime files; imports and syntax pass.

An offscreen geometry review checked short/tall seated residents and walking /
running silhouettes. It uses simplified material shading, not the game's
post-processing. The available browser failed to create a WebGL context, so
this is **not** a claim of a completed browser playthrough or measured mobile
frame rate. The browser harness in `docs/the-playthrough.md` remains the route
for hardware verification.

`node scripts/benchmark-residents.mjs` measures CPU animation for 24 residents
and simulation for 216 background porters. One local before/after sample:

| Workload | Before median / p95 | After median / p95 |
| --- | --- | --- |
| 24 resident poses | 0.991 / 1.403 ms | 0.849 / 1.390 ms |
| 216 porter records | 0.161 / 0.220 ms | 0.129 / 0.158 ms |

These are short CPU samples on the development host, subject to noise. They
exclude rendering, loading, post-processing and device thermals; they must not
be converted to a game FPS estimate.
