# Viscous research solver

D3Q19 BGK with a static Smagorinsky closure (Cs = 0.16), no-slip halfway bounce-back on the voxel car, slip ground, equilibrium farfield, and first-order zero-gradient outflow. Speed in lattice units is 0.06. The default reduced Reynolds number is 500 based on vehicle length; this is not the road-speed Reynolds number displayed in the ideal-flow study.

Compile using Zig 0.15.2 from https://ziglang.org/download/ :

`powershell -File tools/build-solver.ps1`

The solver stops on density excursions outside 0.8–1.2 rather than silently clamping unstable results. Pressure coefficient comes from lattice density, not Bernoulli. It has not been validated for automotive forces. The current domain is small and the outlet/voxel boundaries are approximate. A resolved wake does not establish accurate drag or lift. Stationary wheels are represented by the sealed voxel envelope.

Method references: https://palabos.unige.ch/get-started/lattice-boltzmann/what-lattice-boltzmann and https://arxiv.org/abs/1206.0389 . The latter discusses Smagorinsky closure with MRT; this implementation uses BGK, not the paper's MRT collision operator.

