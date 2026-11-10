# Builds the Android release APK (arm64 phones) and saves it to the Desktop as vanna.apk.
# Why a copy in C:\vb: under the real project path, React Native's C++ build (CMake + ninja) exceeds Windows' path-length
# limit and fails with "ninja: error: mkdir(...): No such file or directory". subst / junction drives don't help (the tools
# resolve them back to the long path). The project itself is never changed by this script.
# Usage (PowerShell):  powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1
$ErrorActionPreference = "Stop"
$src = Split-Path -Parent $PSScriptRoot
$dst = "C:\vb"
$apkOut = Join-Path ([Environment]::GetFolderPath("Desktop")) "vanna.apk"

Write-Host "1/4 Copying $src -> $dst (skips android/, .expo, native build caches)"
robocopy $src $dst /MIR /NFL /NDL /NJH /NJS /NP /XD "$src\android" "$src\.expo" ".cxx" ".gradle" | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE)" }
# stale native build output from builds under the long path
Get-ChildItem "$dst\node_modules" -Directory -Recurse -Depth 4 -Filter build -ErrorAction SilentlyContinue |
  Where-Object { $_.Parent.Name -eq "android" } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$dst\modules\vanna-dynamic\android\build" -Recurse -Force -ErrorAction SilentlyContinue

Set-Location $dst
Write-Host "2/4 Generating the Android project (expo prebuild)"
npx expo prebuild --platform android --clean --no-install
if ($LASTEXITCODE -ne 0) { throw "prebuild failed" }

Write-Host "3/4 Building the release APK (arm64-v8a)"
Set-Location "$dst\android"
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --console=plain
if ($LASTEXITCODE -ne 0) { throw "gradle build failed" }

Write-Host "4/4 Copying the APK to $apkOut"
Copy-Item "$dst\android\app\build\outputs\apk\release\app-release.apk" $apkOut -Force
Get-Item $apkOut | Format-List FullName, Length, LastWriteTime
Write-Host "DONE"
