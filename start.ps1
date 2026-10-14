$ErrorActionPreference = 'Stop'
$atlasRuntime = Join-Path $PSScriptRoot 'runtime\electron.exe'
$atlasApp = Join-Path $PSScriptRoot 'app'
if (-not (Test-Path -LiteralPath $atlasRuntime)) { throw 'Electron runtime is missing. Keep the runtime folder next to this launcher.' }
$atlasCommand = Get-Command codex.exe -ErrorAction SilentlyContinue
if ($atlasCommand) { $env:QUOTA_ATLAS_CODEX = $atlasCommand.Source }
Start-Process -FilePath $atlasRuntime -ArgumentList ('"' + $atlasApp + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Normal
