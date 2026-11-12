# Standalone Hatch Meadow (public static release)

This separate branch hosts only the public browser runtime of Flower Meadow, copied from Hatch Render source commit 5bbaccef74c7bf031500a6ab3a6c0cc0bf213e84.

Its ES modules are served with correct MIME types through a free, commit-pinned raw.githack CDN URL. This does not modify the mac-remote application's main branch.

Includes 3D flower heads and simplex-noise stems, triangular grass, camera controls, and CPU boolean subtraction of full-width square-capped hatches without GPU depth masks.

Vendored Mapbox Earcut v3.0.2 (ISC; see vendor/LICENSE-earcut.txt). Source repo uses the npm dependency, but this static release imports the vendored module.
