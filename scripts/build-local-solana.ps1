$ErrorActionPreference = 'Stop'
$src = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dst = 'C:\s'
robocopy $src $dst /MIR /XD .git .expo .gradle .cxx android node_modules /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed" }
robocopy "$src\node_modules" "$dst\node_modules" /MIR /XD .cxx /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy nm failed" }
Set-Location $dst
if (-not (Test-Path "$dst\android")) { npx expo prebuild --platform android --no-install; if ($LASTEXITCODE -ne 0) { throw "prebuild failed" } }
Remove-Item -Recurse -Force "$dst\android\build\generated\autolinking" -ErrorAction SilentlyContinue
Set-Location "$dst\android"
& .\gradlew.bat app:assembleDebug "-PreactNativeArchitectures=x86_64"
Write-Host "exit=$LASTEXITCODE"
if ($LASTEXITCODE -eq 0) { Write-Host "APK: $dst\android\app\build\outputs\apk\debug\app-debug.apk" }


