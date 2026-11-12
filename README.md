# Never the Same — original scene construction × Hatch Render

**Static browser edition**, using Nat Sarkissian's original artwork's 60×60 planting lattice (3,600 plant positions), original 100×175 terrain-height and light grids, Gaussian jitter, growth and flower species distribution, segmented stems, curved leaves and petals, disks, and grass triangles.

The old raster hatching/shader/animation pipeline is replaced by the shared WebGL Hatch Render engine with full-width CPU polygon boolean occlusion and square stroke caps. The interface exposes hatch controls, independent 0–100% plant and grass visibility sliders, plus scene regeneration.

Canonical Hatch Render source: https://github.com/nathaniel-sarkissian/hatch-render/commit/d180985e6b5db7c16d931109540429677ece8626

Original minted artwork: https://verse.works/series/never-the-same-by-nat-sarkissian

The archived 2025 source is preserved in Hatch Render's `research-nts-ipfs` branch.

This static release uses vendored Mapbox Earcut v3.0.2 (ISC license in `vendor/LICENSE-earcut.txt`), and lives on an isolated public branch to avoid modifying mac-remote main.

The current static release retains the original per-shape hatch parameters: leaf 4x density and .30 wobble; petals 1.2x/.35; disk 1x/.30; grass 1.5x/.40, with source-specific ink widths and 0.1 endpoint extension. The shared hatch renderer runs the new independent endpoint noise after clipping.

The plant and grass sliders start at 100%, reproducing all 3,600 original planting positions and every grass blade. Intermediate settings filter complete plant groups or individual grass blades by stable seed-derived reveal order without rerolling the source scene.

The original raster pipeline drew each flower and leaf hatch nine times with independently randomized endpoints (layerCount 0–8), while grass was drawn on the first four layers only. This static renderer now replays the SAME clipped hatch lattice with nine independent deterministic wobble passes for plant polygons, four for grass, and translucent layering to approximate the original compositing without restoring its shader effects. Lines, stems, and outlines are not repeated.

The renderer now performs full-width CPU foreground occlusion ONCE on each polygon's un-wobbled hatch lattice before the nine flower/leaf or four grass redraws. Only the already-visible fragments are independently wobbled for each layer; no extra polygon clipping is performed per pass. Other single-pass hatching demos retain their post-jitter clipping semantics.

## GPU-generated meadow experiment

The experimental WebGL2 `gpu.html` page uses shader-generated roots, stems, leaves, petals, disks and grass directly from 3,600 GPU instance IDs, including all six recovered original flower species and 13-vertex leaf/petal outlines. No CPU polygon scene is allocated or read back. It supports 0-100% independent plant and grass counts, per-frame fresh seed generation, CPU submission timing, FPS and optional GPU timing. Hatching is **not** yet implemented in this separate GPU study; the original CPU-clipped NTS hatching remains available at `index.html`. The GPU terrain and growth/noise are visual approximations, not a source-identical reimplementation. Canonical source commit: https://github.com/nathaniel-sarkissian/hatch-render/commit/c5dc9c80ba40f2d4dbecc4f0b0fbc74e90e0560d

## Orbit, pan and zoom controls for GPU Meadow

The GPU geometry prototype supports mouse and touch orbit controls: left drag / one finger orbit, Shift or right/middle drag pan, wheel zoom anchored under the cursor, and two-finger pan and pinch zoom. A Reset View button restores the original framing; azimuth, elevation and zoom are shown live. Camera direction and target are uploaded as shader uniforms, without regenerating any CPU geometry. The generated scene and existing NTS hatcher are untouched. This release uses canonical commit https://github.com/nathaniel-sarkissian/hatch-render/commit/c03ee981cc864bd971bbd78245eba7583cfed10f

## Original meadow geometry reconstructed in GPU (November 2026)

The GPU geometry study now follows the recovered original's 60 × 60 field, its six species' exact sizes, layer and petal counts, source leaf/petal formulas, paired grass positions, steep 100 × 175 terrain elevation and source-style 45° projection. A 60×60 GPU-only RGBA8 prepass computes per-site growth, age, terrain and clustered flower types, and five instanced draw calls generate the 3D forms. A tiny image-wide deterministic seed setup selects the exact original palette, background, and shuffled species order. The original OpenSimplex field and incremental stem integration are approximated in shaders; this is a source-based geometry reconstruction, not pixel-identical minted-token playback. Hatching remains the next milestone and is unchanged in `index.html`.

Canonical source: https://github.com/nathaniel-sarkissian/hatch-render/commit/4c137eb28f17f637bff6c693cebb47cf8933eb6a

GLSL shader compile correction: https://github.com/nathaniel-sarkissian/hatch-render/commit/4d629dcf2842b481a53a5ede8891256cc7cee2cb

Default camera now reproduces the original YZ 45° projection and source-centered 75×75 framing instead of tilting XY: https://github.com/nathaniel-sarkissian/hatch-render/commit/f110450b517ad124579565a7ce66994f73a28cc8

Original source grass screen-space placement and deterministic default seed (2611): https://github.com/nathaniel-sarkissian/hatch-render/commit/4d45bc5f51c4cd5d2e601171ef31cab714b8c001
\n## Mobile flower visibility fix (2026-11-12)
Previously, the GPU meadow submitted 4.2 million vertices per frame and could fail to show flower geometry on mobile even when grass drew. It now uses instanced TRIANGLE_FAN silhouettes for each leaf, petal and flower disk, reducing GPU vertex work by more than half without changing the source-based planting layout. Narrow viewports use seven perimeter vertices; zooming in restores thirteen. Degenerate young stem tangents no longer generate NaNs that can hide leaf/petal geometry. Both full meadow and plant-only pixel-visible flower colors are now verified by headless Chrome, including a phone-sized viewport. The original /nts/ hatching renderer is unaffected. Canonical commit: https://github.com/nathaniel-sarkissian/hatch-render/commit/c1f283276dbf4ce01b48b9ab2604628826b3e25b

## Fix: recognizable flower heads on iPhone (2026-11-12)

The original sketch's grass was explicitly **non-occluding**, while the WebGL prototype wrote grass into the depth buffer and hid flower heads. Grass now draws with depth writes disabled, and leaf/petal/disk fans use interior anchor points. All platforms draw the original 13-point silhouettes (the mobile seven-point shortcut is removed). The source-based scene, original six species and orbit/pan/zoom are preserved. The browser QA now loads an actual full-screen canvas on a phone-sized Chrome viewport at the AZ 185°, EL 30°, Zoom 77% view provided in the user's screenshot, captures that view, and validates visible flower pixels in the complete and grass-free scenes. Canonical source commit: https://github.com/nathaniel-sarkissian/hatch-render/commit/a8c4025461bc1e5c17aa08549a90e3d64e882be6.

## Compact GPU Safari flower path (2026-11-12)

After a real iPhone kept rendering only grass despite headless Chrome success, `src/gpu-meadow-mobile.js` now provides an explicitly lightweight GPU shader on iPhone/iPad and screen widths under 640px. It draws species-specific camera-facing flower heads, petal color palettes, disks, stems and leaves from the SAME GPU 60x60 source atlas, using around 430,000 vertices instead of 1.79 million and avoiding the Apple GPU's expensive per-vertex source-geometry transformations. Flowers are drawn last over vegetation for visibility. Browser QA tests the mobile rendering mode and WebGL draw errors. The original `/nts/` and full desktop source geometry are unchanged. Canonical source: https://github.com/nathaniel-sarkissian/hatch-render/commit/a18fc6c4a2dda80e457aac5471a1eac13fe3e61c
