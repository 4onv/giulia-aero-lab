$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$destination=Join-Path $projectRoot 'desktop-app'
New-Item -ItemType Directory -Force $destination | Out-Null
Copy-Item "$projectRoot/node_modules/electron/dist/*" $destination -Recurse -Force
$appFolder=Join-Path $destination 'resources/app'
New-Item -ItemType Directory -Force $appFolder | Out-Null
foreach ($folder in @('dist','desktop')) {
  foreach ($file in Get-ChildItem -LiteralPath (Join-Path $projectRoot $folder) -Recurse -File) {
    if ($file.Name -eq 'wake-preview.bin') { continue }
    $relative=$file.FullName.Substring($projectRoot.Length+1)
    $target=Join-Path $appFolder $relative
    New-Item -ItemType Directory -Force (Split-Path $target -Parent) | Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $target -Force
  }
}
foreach ($notice in @('MODEL-LICENSE.txt','THIRD_PARTY_NOTICES.md','README.md')) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $notice) -Destination $appFolder -Force
}
$version=(Get-Content -LiteralPath "$projectRoot/package.json" -Raw | ConvertFrom-Json).version
@{name='giulia-aero-lab';version=$version;main='desktop/main.cjs'} | ConvertTo-Json | Set-Content "$appFolder/package.json"
$sourceExe=Join-Path $destination 'electron.exe'
$targetExe=Join-Path $destination 'Giulia Aero Lab.exe'
Copy-Item -LiteralPath $sourceExe -Destination $targetExe -Force
Write-Output "Desktop application: $targetExe"
