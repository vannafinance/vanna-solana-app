# Starts server.js hidden (no console window). Stops an older copy first. Prints the URL.
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*perps-flow*server.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'node'
$psi.Arguments = '"' + (Join-Path $dir 'server.js') + '"'
$psi.WorkingDirectory = $dir
$psi.CreateNoWindow = $true
$psi.UseShellExecute = $false
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
[System.Diagnostics.Process]::Start($psi) | Out-Null
Start-Sleep -Milliseconds 800
$port = Get-Content (Join-Path $dir '.port') -ErrorAction SilentlyContinue
"http://localhost:$port/"
