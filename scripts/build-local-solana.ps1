# Usage: scripts\build-local-solana.ps1            -> debug dev build for the x86_64 emulator (needs Metro)
#        scripts\build-local-solana.ps1 -Release   -> standalone arm64 APK for real Android phones (JS bundled, shareable)
param([switch]$Release)
$ErrorActionPreference = 'Stop'
$src =(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dst = 'C:\s'
robocopy $src $dst /MIR /XD "$src\.git" "$src\.expo" "$src\.gradle" "$src\.cxx" "$src\.claude" "$src\android" "$src\node_modules" /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed" }
robocopy "$src\node_modules" "$dst\node_modules" /MIR /XD .cxx /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy nm failed" }
Set-Location $dst
$pkg = (Get-Content "$dst\app.json" -Raw | ConvertFrom-Json).expo.android.package
$gradle = "$dst\android\app\build.gradle"
if ((Test-Path $gradle) -and -not (Select-String -Path $gradle -Pattern "applicationId\s+`"$pkg`"" -Quiet)) {
  Remove-Item -Recurse -Force "$dst\android"
}
if (-not (Test-Path "$dst\android")) { npx expo prebuild --platform android --no-install; if ($LASTEXITCODE -ne 0) { throw "prebuild failed" } }
# Sign with the team's own private key (credentials/vanna-android.keystore, git-ignored), never React Native's public debug key:
# anyone can sign an app with that one. The key keeps the debug alias and password because the generated debug signingConfig expects them.
$key = Join-Path $src 'credentials\vanna-android.keystore'
if (-not (Test-Path $key)) { throw "Missing $key. Create it with keytool (alias androiddebugkey, password android) and back it up; it is the app's identity." }
Copy-Item $key "$dst\android\app\debug.keystore" -Force
Remove-Item -Recurse -Force "$dst\android\build\generated\autolinking" -ErrorAction SilentlyContinue
Set-Location "$dst\android"
if ($Release) {
  # Release build signs with the same private key (the generated release config reuses the debug keystore we replaced above).
  & .\gradlew.bat app:assembleRelease "-PreactNativeArchitectures=arm64-v8a" --max-workers=2 --no-daemon "-Dorg.gradle.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=768m"
  Write-Host "exit=$LASTEXITCODE"
  if ($LASTEXITCODE -eq 0) { Write-Host "APK: $dst\android\app\build\outputs\apk\release\app-release.apk" }
} else {
  & .\gradlew.bat app:assembleDebug "-PreactNativeArchitectures=x86_64"
  Write-Host "exit=$LASTEXITCODE"
  if ($LASTEXITCODE -eq 0) { Write-Host "APK: $dst\android\app\build\outputs\apk\debug\app-debug.apk" }
}


