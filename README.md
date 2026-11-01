# Giulia Aero Lab

A local 3D aerodynamic exploration app built around a detailed **Alfa Romeo Giulia** mesh. It combines an interactive Three.js scene, a numerical potential-flow field, and a Windows desktop shell.

**Status:** working prototype. Ideal-flow visualization is available; the experimental viscous solver and complete parts inspection are still in development.

## Features

- Detailed vehicle geometry: **1,161,110 triangles** across **59 mesh groups**.
- Orbit, zoom, camera presets, studio lighting, and revised paint/glass/trim materials.
- Adjustable air speed and wind angle.
- Streamlines, surface-pressure coloring, velocity slices, and near-surface probes.
- Car-only viewing with airflow overlays removed.
- CSV study export.
- Electron desktop window with tray controls, offline assets and fonts, and saved wind settings.
- Six automated numerical/data checks.

## Run locally

Use **Node.js 22.12 or newer**.

### Local preview — no dependency installation required

```sh
git clone https://github.com/4onv/giulia-aero-lab.git
cd giulia-aero-lab
node tools/serve.mjs
```

Open **http://127.0.0.1:8766**. This serves the bundled app only on your computer.

### Desktop app

```sh
npx pnpm@11.25.0 install --frozen-lockfile
node node_modules/electron/install.js
npm run desktop
```

The explicit Electron installation step also works when package-manager lifecycle scripts are disabled. The close button hides the app to the tray; use the tray menu to reopen, keep it on top, or quit.

To build the Windows portable folder:

```powershell
powershell -File tools/package-desktop.ps1
```

Run `desktop-app/Giulia Aero Lab.exe` and keep its surrounding files together. Generated executables and dependencies are intentionally excluded from this source repository.

## How the airflow works

The visible car mesh is converted into a sealed outer envelope on a **136 × 48 × 72** grid at **100 mm** spacing. Two finite-volume Laplace solutions form the longitudinal and lateral velocity bases. Their linear combination represents the selected wind angle, and streamlines are integrated through the resulting 3D field.

The ideal-flow pressure coefficient is calculated as `Cp = 1 − (local speed / freestream speed)²`. Solid cells are excluded from fluid interpolation. Rendering detail is substantially finer than the computational grid.

### Experimental viscous solver

`solver/lbm.c` implements a D3Q19 lattice Boltzmann solver compiled to WebAssembly, with BGK collision, a static Smagorinsky closure, no-slip vehicle boundaries, slip ground, and a startup ramp. It runs in a worker and uses density-derived pressure.

The wake control remains **disabled pending successful long-run validation**. Its reduced Reynolds number is **500**, not the road-speed Reynolds number. The latest interrupted test reached 620 steps; the full test target is 2,000 steps.

## Accuracy and limitations

This is an exploratory project, **not validated automotive CFD**. The default inviscid method cannot predict viscous drag, boundary layers, separation, or a turbulent wake. Neither mode provides a validated drag/lift coefficient. The car is an existing artist asset, not manufacturer-certified CAD.

Complete interior/engine-bay geometry and individually labelled part inspection are unfinished. Desktop scene initialization is confirmed; final visual and tray-interaction checks remain outstanding.

## Tests and solver builds

```sh
npm test
npm run solve
```

The standard tests cover field integrity/convergence, fluid interpolation, yaw blending, streamline integrity, physical scale, and viscous pressure sampling. They are numerical checks, not wind-tunnel validation.

To rebuild the experimental solver, install **Zig 0.15.2**, then run:

```powershell
powershell -File tools/build-solver.ps1 -Zig "C:\path\to\zig.exe"
npm run test:viscous
```

The long viscous test is intentionally separate from the quick test suite. It writes a validation report only after successful completion.

## Project structure

| Path | Purpose |
| --- | --- |
| `dist/` | App source, local rendering libraries, and required assets |
| `desktop/` | Electron window, tray, protocol and preload code |
| `solver/` | Experimental C solver and method notes |
| `tools/` | Local server, potential-flow solver and build/package scripts |
| `tests/` | Numerical and data-integrity checks |

## Roadmap

- [x] Detailed Giulia visualization and ideal-flow exploration
- [x] Local desktop packaging and offline assets
- [ ] Finish viscous-solver stability and performance validation
- [ ] Verify wake visualization and exported results end to end
- [ ] Complete native visual/tray checks
- [ ] Add accurately mapped exterior and interior part descriptions
- [ ] Obtain and integrate accurate engine-bay geometry

## Credits and asset terms

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [MODEL-LICENSE.txt](MODEL-LICENSE.txt). The vehicle is included only as part of this non-commercial application; do not redistribute it as a standalone asset. Third-party assets and libraries retain their own terms. No blanket open-source licence is granted for the complete repository.

This project is not affiliated with or endorsed by Alfa Romeo.
