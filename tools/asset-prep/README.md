# Optional component preparation

This tool extracts connected surfaces from selected original Giulia mesh groups, retaining positions, normals and materials. It also combines matching material batches within a component. It is not needed to run the bundled application.

Install dependencies in this directory, then run:

    npm install
    node split-parts.mjs path/to/original-giulia.glb path/to/output.glb

Use the original artist GLB before component extraction (the project's initial asset is in commit 61a5b0b). Already split inputs are rejected. The output retains approximately 1.16 million triangles and writes a component bounds report beside the new GLB. Names in dist/parts.js are tied to this source; other vehicle assets need a new mapping and a new aerodynamic envelope/field.

The rendering asset was compressed twice during preparation; rerunning this single-pass script can produce a slightly different binary and degenerate-triangle count. Geometry tests allow only a small difference.
