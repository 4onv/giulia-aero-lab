$projectRoot=Split-Path $PSScriptRoot -Parent
$destination=Join-Path $projectRoot 'desktop-app'
New-Item -ItemType Directory -Force $destination | Out-Null
Copy-Item "$projectRoot/node_modules/electron/dist/*" $destination -Recurse -Force
$appFolder=Join-Path $destination 'resources/app'
New-Item -ItemType Directory -Force $appFolder | Out-Null
Copy-Item "$projectRoot/dist" "$appFolder/dist" -Recurse -Force
Copy-Item "$projectRoot/desktop" "$appFolder/desktop" -Recurse -Force
Copy-Item "$projectRoot/MODEL-LICENSE.txt" $appFolder -Force
'{"name":"giulia-aero-lab","version":"0.3.0","main":"desktop/main.cjs"}' | Set-Content "$appFolder/package.json"
$sourceExe=Join-Path $destination 'electron.exe'
$targetExe=Join-Path $destination 'Giulia Aero Lab.exe'
if (!(Test-Path $targetExe)) { Rename-Item -LiteralPath $sourceExe -NewName 'Giulia Aero Lab.exe' }
Write-Output "Desktop application: $targetExe"
