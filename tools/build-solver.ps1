param([string]$Zig = "zig")
$projectRoot=Split-Path $PSScriptRoot -Parent
& $Zig cc "$projectRoot/solver/lbm.c" -target wasm32-freestanding -O3 -fno-builtin -nostdlib '-Wl,--no-entry' '-Wl,--export=init' '-Wl,--export=advance' '-Wl,--export=snapshot' '-Wl,--export=step_count' '-Wl,--export=mask_ptr' '-Wl,--export=output_ptr' '-Wl,--export=set_ramp' '-Wl,--initial-memory=100663296' '-Wl,--max-memory=134217728' -o "$projectRoot/dist/assets/lbm.wasm"
if ($LASTEXITCODE -ne 0) { throw 'Solver build failed' }

