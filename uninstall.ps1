param([switch]$DryRun)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'path-safety.ps1')
$atlasHere = [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\')
Assert-AtlasPlainPath $atlasHere
$atlasMeta = Get-Content -LiteralPath (Join-Path $atlasHere 'installed.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $atlasMeta.installationRoot -or -not [IO.Path]::IsPathRooted($atlasMeta.installationRoot)) { throw 'Run uninstall.cmd from a verified installed copy.' }
$atlasRoot = [IO.Path]::GetFullPath($atlasMeta.installationRoot).TrimEnd('\')
$atlasSafeHere = Assert-AtlasChild $atlasHere $atlasRoot
if ((Split-Path -Leaf $atlasSafeHere) -ne $atlasMeta.version) { throw 'Installation identity mismatch.' }
$atlasTargets = @()
foreach ($atlasDir in @(Get-ChildItem -LiteralPath $atlasRoot -Directory)) {
 if ($atlasDir.Name -notmatch '^\d+\.\d+\.\d+$') { continue }
 $atlasTarget = Assert-AtlasChild $atlasDir.FullName $atlasRoot
 $atlasMarkerPath = Join-Path $atlasTarget 'installed.json'
 if (-not (Test-Path -LiteralPath $atlasMarkerPath)) { continue }
 $atlasMarker = Get-Content -LiteralPath $atlasMarkerPath -Raw -Encoding UTF8 | ConvertFrom-Json
 $atlasPkg = Get-Content -LiteralPath (Join-Path $atlasTarget 'app\package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 if ($atlasPkg.name -eq 'quota-atlas' -and $atlasMarker.installationRoot -eq $atlasRoot -and $atlasMarker.version -eq $atlasDir.Name) { $atlasTargets += $atlasTarget }
}
if ($atlasTargets.Count -eq 0) { throw 'No verified installed version to remove.' }
foreach ($atlasTarget in $atlasTargets) { Assert-AtlasPlainTree $atlasTarget }
$atlasData = [IO.Path]::GetFullPath($atlasMeta.dataDirectory).TrimEnd('\')
foreach ($atlasTarget in $atlasTargets) { if ($atlasData -eq $atlasTarget -or $atlasData.StartsWith($atlasTarget + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Account data overlaps program files. Removal cancelled.' } }
$atlasPlan = [pscustomobject]@{removeVersions=@($atlasTargets | ForEach-Object {Split-Path -Leaf $_});accountDataPreserved=$true;dryRun=[bool]$DryRun}
if ($DryRun) { $atlasPlan | ConvertTo-Json; return }
Import-AtlasProcessTools
foreach ($atlasTarget in $atlasTargets) {
 $atlasExecutable = Join-Path $atlasTarget 'runtime\electron.exe'
 $atlasOwned = @(Get-CimInstance Win32_Process -Filter "Name='electron.exe'" | Where-Object {$_.ExecutablePath -eq $atlasExecutable})
 foreach ($atlasProcess in $atlasOwned) {
  Get-CimInstance Win32_Process -Filter "Name='codex.exe'" | Where-Object {$_.ParentProcessId -eq $atlasProcess.ProcessId -and $_.CommandLine -match 'app-server --listen stdio://'} | ForEach-Object {Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue}
  Stop-Process -Id $atlasProcess.ProcessId -ErrorAction SilentlyContinue
 }
}
if ($atlasMeta.shortcut -and (Test-Path -LiteralPath $atlasMeta.shortcut)) {
 Assert-AtlasPlainPath $atlasMeta.shortcut
 $atlasShell = New-Object -ComObject WScript.Shell
 $atlasShortcut = $atlasShell.CreateShortcut($atlasMeta.shortcut)
 if ($atlasTargets | Where-Object {$atlasShortcut.TargetPath -eq (Join-Path $_ 'runtime\electron.exe')}) { Remove-Item -LiteralPath $atlasMeta.shortcut -Force }
}
$atlasRunKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$atlasRunValue = (Get-ItemProperty -LiteralPath $atlasRunKey -Name QuotaAtlas -ErrorAction SilentlyContinue).QuotaAtlas
if ($atlasRunValue -and $atlasRunValue.IndexOf($atlasRoot + '\',[StringComparison]::OrdinalIgnoreCase) -ge 0) { Remove-ItemProperty -LiteralPath $atlasRunKey -Name QuotaAtlas }
foreach ($atlasTarget in $atlasTargets) {
 # Verify each final absolute target immediately before recursive removal.
 $atlasCheckedTarget = Assert-AtlasChild $atlasTarget $atlasRoot
 Remove-Item -LiteralPath $atlasCheckedTarget -Recurse -Force
}
$atlasPlan | ConvertTo-Json
