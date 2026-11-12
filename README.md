# Never the Same — original scene construction × Hatch Render

**Static browser edition**, using Nat Sarkissian's original artwork's 60×60 planting lattice (3,600 plant positions), original 100×175 terrain-height and light grids, Gaussian jitter, growth and flower species distribution, segmented stems, curved leaves and petals, disks, and grass triangles.

The old raster hatching/shader/animation pipeline is replaced by the shared WebGL Hatch Render engine with full-width CPU polygon boolean occlusion and square stroke caps. The interface exposes hatch controls, independent 0–100% plant and grass visibility sliders, plus scene regeneration.

Canonical Hatch Render source: https://github.com/nathaniel-sarkissian/hatch-render/commit/8e1a962ee3a90aadd17d5df554316af2e67f152c

Original minted artwork: https://verse.works/series/never-the-same-by-nat-sarkissian

The archived 2025 source is preserved in Hatch Render's `research-nts-ipfs` branch.

This static release uses vendored Mapbox Earcut v3.0.2 (ISC license in `vendor/LICENSE-earcut.txt`), and lives on an isolated public branch to avoid modifying mac-remote main.

The current static release retains the original per-shape hatch parameters: leaf 4x density and .30 wobble; petals 1.2x/.35; disk 1x/.30; grass 1.5x/.40, with source-specific ink widths and 0.1 endpoint extension. The shared hatch renderer runs the new independent endpoint noise after clipping.

The plant and grass sliders start at 100%, reproducing all 3,600 original planting positions and every grass blade. Intermediate settings filter complete plant groups or individual grass blades by stable seed-derived reveal order without rerolling the source scene.
