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
