# Never the Same — original geometry × Hatch Render

Static browser demo of Nat Sarkissian's original **Never the Same** flower and grass geometry
from the Ethereum Fxhash/Verse edition, rendered with Hatch Render's modern WebGL
square-capped hatch renderer and CPU full-width boolean occlusion.

The original geometry has seven flower species, layered curved petals, flower head disks,
leaves and jointed stems, and triangular blades of grass. No wind/growth animation, original
raster hatching or shader treatments are used.

Original code: `nathaniel-sarkissian/hatch-render`, commit
`bd195d9431b1999f752042d46e0af3f0e1ab867b`, on the `/nts/` Vite page.
Original minted-source snapshot: Ethereum contract
`0x34D827cFFECD117C61BcdCE797f3Cd3993d0C409`,
IPFS `QmcEFyzV5UHgdyVPTbaSVFd5jgCKq3SQM79HqMzAUUYWM5`.

The static release avoids the Vite/npm runtime by importing the same JS modules
directly, with the one build dependency Earcut v3.0.2 vendored as an ES module.
The ISC license for Earcut is in `vendor/LICENSE-earcut.txt`.

This branch is entirely separate from mac-remote's main branch and doesn't affect
the Mac remote control application.
