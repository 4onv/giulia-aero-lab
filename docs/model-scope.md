# Vehicle asset scope and research

The bundled CadNav artist asset is the project baseline. Connected-surface extraction exposes existing geometry; it does not manufacture new mechanical detail. The rendered mesh contains 1,161,083 triangles after compression and 132 material batches. The original source had 1,161,110 triangles in 59 groups. Degenerate triangles removed during Draco preparation account for the small difference. The aerodynamic envelope remains the original sealed 100 mm grid.

## Inspection scope

Body panels, glazing, wheels, tyres, calipers, mirror surfaces, seats, headrests, the steering-wheel rim and selected trim are mapped by source position and visible geometry. Some objects remain combined assemblies. Unmapped surfaces remain selectable and explicitly unidentified. Descriptions explain general function; they are not service instructions, OEM part numbers or manufacturer verification.

The source contains no texture files or verified complete engine assembly. Version 0.5 adds the reference reconstruction described below. It does not change the aerodynamic grid or claim factory dimensions. A measured full mechanical assembly remains outside the available source data.

## Asset research — 1 November 2026

- [2017 Giulia 2.0 Veloce Q4 scan, CGTrader](https://www.cgtrader.com/3d-models/car/car/2017-alfa-romeo-giulia-2-0-veloce-q4-high-precision-3d-scan): seller advertises individual component meshes, cabin structures and engine-bay/powertrain layout. Listed at $70, approximately 1 GB, mesh data in STL and CATIA-related formats. It is a **2.0 Veloce**, not the Quadrifoglio. Files, provenance, completeness and public-repository redistribution rights have not been independently verified. Not purchased or included.
- [Giulia interior/exterior by Hossein Heydari, ArtStation](https://www.artstation.com/marketplace/p/3YW9k/alfa-romeo-giulia): seller advertises textured interior and exterior geometry, 712,738 polygons, and FBX/OBJ exports; listed standard license $70. The listing does not establish a complete engine assembly or permission to publish extractable source assets. Not purchased or included.

A royalty-free purchase does not by itself establish permission to distribute the source model in a public GitHub repository. A future asset must match the intended Giulia variant and have appropriate use and distribution permission. Keep paid assets local if their license only permits integration into a protected end product.

## Reference reconstruction — 3 November 2026

`dist/vehicle-details.js` authors 21 visible engine-bay assemblies and 10 cabin control assemblies in original geometry. The bonnet and its existing vents open together; vent surrounds are partitioned from mesh 029 without dropping triangles. Six independently selectable service points follow figure 13 of the official Quadrifoglio supplement: oil dipstick, oil filler, engine coolant, brake-fluid access cover, washer filler and intercooler coolant. Vehicle left is +Z; front is −X.

The cover, intake pipes, front ducts, throttle housings, curved brace, strut tops, reservoirs, wiring, visible hard lines and front carrier follow the photographed arrangement. Hard-line circuit assignments are explicitly unverified. The battery is not placed under the bonnet; only the remote positive cover is represented. Cabin controls follow the automatic, left-hand-drive layout. The existing artist body/cabin may differ in trim details from a particular production car.

These are visual reconstructions with estimated dimensions, not scans or CAD. Decorative fasteners are grouped into selectable assemblies. Internal engine mechanisms, hidden circuits, all individual switches, wiring pinouts and OEM part numbers are not represented. Descriptions identify components and explain function; they are not workshop instructions. No reference photograph or manual artwork is redistributed.

References:

- [2017 Quadrifoglio supplement, figure 13, printed page 10](https://aftersales.fiat.com/eLumData/EN/83/620_GIULIA/83_620_GIULIA_604.90.474_EN_07_12.17_SA_QF/83_620_GIULIA_604.90.474_EN_07_12.17_SA_QF.pdf) — service-point names and layout.
- [2017 Giulia user guide](https://vehicleinfo.mopar.com/assets/publications/en-us/Alfa_Romeo/2017/Giulia/2017-Alfa_Romeo-Giulia-UG_4th.pdf) — instruments, climate controls, selector and Connect controls, particularly printed pages 33, 42 and 219.
- [MotorTrend: 2017 Giulia Quadrifoglio](https://www.motortrend.com/features/alfa-romeo-giulia-quadrifoglio-6th-place-2017-best-drivers-car) — visible engine-bay photograph.
