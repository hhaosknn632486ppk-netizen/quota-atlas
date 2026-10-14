param(
 [string]$SourceRoot = $PSScriptRoot,
 [string]$DestinationRoot = (Join-Path $env:LOCALAPPDATA 'Programs\QuotaAtlas'),
 [string]$DataDirectory = (Join-Path $env:LOCALAPPDATA 'QuotaAtlas\data'),
 [string]$ShortcutDirectory = '', [string]$ShortcutName = 'Quota Atlas.lnk', [string]$AppId = 'QuotaAtlas.Desktop',
 [switch]$NoLaunch, [switch]$NoShortcuts, [switch]$NoMigration, [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'path-safety.ps1')
if ($AppId -notmatch '^QuotaAtlas\.(Desktop|Validation\.[A-Za-z0-9]+)$' -or $ShortcutName -notmatch '^[a-zA-Z0-9 ._-]+\.lnk$') { throw 'Invalid application identity or shortcut name.' }
$atlasSource = [IO.Path]::GetFullPath($SourceRoot).TrimEnd('\')
$atlasInstall = [IO.Path]::GetFullPath($DestinationRoot).TrimEnd('\')
$atlasData = [IO.Path]::GetFullPath($DataDirectory).TrimEnd('\')
$atlasPortableData = Join-Path $atlasSource '.local'
Assert-AtlasPlainPath $atlasSource
Assert-AtlasPlainPath $atlasInstall
Assert-AtlasPlainPath $atlasData
if ($atlasData -eq $atlasInstall -or $atlasData.StartsWith($atlasInstall + '\',[StringComparison]::OrdinalIgnoreCase) -or $atlasInstall.StartsWith($atlasData + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Keep application files and account data in separate directories.' }
if ($atlasData.StartsWith($atlasPortableData + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'The data directory must not be nested inside the portable data directory.' }
$atlasManifest = Get-Content -LiteralPath (Join-Path $atlasSource 'installation-manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($atlasManifest.version -notmatch '^\d+\.\d+\.\d+$' -or $atlasManifest.product -ne 'QuotaAtlas') { throw 'Invalid Quota Atlas installation manifest.' }
$atlasVersion = Assert-AtlasChild (Join-Path $atlasInstall $atlasManifest.version) $atlasInstall
$atlasEntries = @($atlasManifest.files)
if ($atlasEntries.Count -lt 3) { throw 'Incomplete installation manifest.' }
$atlasSeen = @{}
foreach ($atlasEntry in $atlasEntries) {
 $atlasRelative = [string]$atlasEntry.path
 if ($atlasRelative -match '(^|[/\\])\.\.?([/\\]|$)|:|^[/\\]|[/\\]{2}' -or $atlasRelative -match '(^|[/\\])(?:\.local|node_modules|test|credentials|state|cookies|logs)([/\\.]|$)') { throw 'Unsafe or private installation path.' }
 if ($atlasRelative -notmatch '^(app[/\\]|runtime[/\\]|start\.(cmd|ps1)$|install\.ps1$|install\.cmd$|update\.cmd$|README(?:\.en)?\.txt$|CONNECTIONS\.txt$|path-safety\.ps1$|uninstall\.(cmd|ps1)$|PRIVACY\.txt$|SUPPORT\.txt$|LICENSE$|THIRD_PARTY_NOTICES\.txt$)' -or [IO.Path]::IsPathRooted($atlasRelative)) { throw 'Unexpected installation file.' }
 $atlasInput = Assert-AtlasChild (Join-Path $atlasSource $atlasRelative) $atlasSource
 $atlasOutput = Assert-AtlasChild (Join-Path $atlasVersion $atlasRelative) $atlasVersion
 if ($atlasSeen.ContainsKey($atlasOutput)) { throw 'Duplicate installation file.' }
 $atlasSeen[$atlasOutput] = $true
 if ($atlasEntry.sha256 -notmatch '^[a-fA-F0-9]{64}$' -or -not (Test-Path -LiteralPath $atlasInput -PathType Leaf) -or (Get-AtlasSha256 $atlasInput) -ne $atlasEntry.sha256) { throw ('Installation file failed verification: ' + $atlasRelative) }
}
$atlasPlan = [pscustomobject]@{version=$atlasManifest.version;installation=$atlasVersion;data=$atlasData;files=$atlasEntries.Count;dryRun=[bool]$DryRun}
if ($DryRun) { $atlasPlan | ConvertTo-Json; return }
Import-AtlasProcessTools
# Stop only this product's processes under the exact source or selected installation.
$atlasProcesses = @(Get-CimInstance Win32_Process -Filter "Name='electron.exe'" | Where-Object {
 $atlasIsProduct = $false
 if ($_.ExecutablePath -eq (Join-Path $atlasSource 'runtime\electron.exe')) { $atlasIsProduct = $true }
 elseif ($_.ExecutablePath -and $_.ExecutablePath.StartsWith($atlasInstall + '\',[StringComparison]::OrdinalIgnoreCase)) {
  $atlasRelativeProcess = $_.ExecutablePath.Substring($atlasInstall.Length + 1)
  if ($atlasRelativeProcess -match '^\d+\.\d+\.\d+\\runtime\\electron\.exe$') {
   try { $atlasPkg = Get-Content -LiteralPath (Join-Path ([IO.Path]::GetDirectoryName([IO.Path]::GetDirectoryName($_.ExecutablePath))) 'app\package.json') -Raw -Encoding UTF8 | ConvertFrom-Json; $atlasIsProduct = ($atlasPkg.name -eq 'quota-atlas') } catch {}
  }
 }
 $atlasIsProduct
})
foreach ($atlasProcess in $atlasProcesses) {
 Get-CimInstance Win32_Process -Filter "Name='codex.exe'" | Where-Object { $_.ParentProcessId -eq $atlasProcess.ProcessId -and $_.CommandLine -match 'app-server --listen stdio://' } | ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }
 Stop-Process -Id $atlasProcess.ProcessId -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $atlasVersion -Force | Out-Null
foreach ($atlasEntry in $atlasEntries) {
 $atlasInput = Assert-AtlasChild (Join-Path $atlasSource $atlasEntry.path) $atlasSource
 $atlasOutput = Assert-AtlasChild (Join-Path $atlasVersion $atlasEntry.path) $atlasVersion
 New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($atlasOutput)) -Force | Out-Null
 if ($atlasInput -ne $atlasOutput) { Copy-Item -LiteralPath $atlasInput -Destination $atlasOutput -Force }
 if ((Get-AtlasSha256 $atlasOutput) -ne $atlasEntry.sha256) { throw 'Installed file verification failed.' }
}
if ($atlasSource -ne $atlasVersion) { Copy-Item -LiteralPath (Join-Path $atlasSource 'installation-manifest.json') -Destination (Join-Path $atlasVersion 'installation-manifest.json') -Force }
if (-not $NoMigration -and -not (Test-Path -LiteralPath $atlasData) -and (Test-Path -LiteralPath (Join-Path $atlasSource '.local\state.json'))) {
 Assert-AtlasPlainPath $atlasPortableData
 # Reject links anywhere in a portable profile before migrating it.
 Get-ChildItem -LiteralPath $atlasPortableData -Recurse -Force | ForEach-Object { if (($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Linked account data cannot be migrated automatically.' } }
 New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($atlasData)) -Force | Out-Null
 Copy-Item -LiteralPath $atlasPortableData -Destination $atlasData -Recurse
}
New-Item -ItemType Directory -Path $atlasData -Force | Out-Null
$atlasShortcutPath = $null
if (-not $NoShortcuts) {
 if (-not $ShortcutDirectory) { $ShortcutDirectory = [Environment]::GetFolderPath('Programs') }
 Assert-AtlasPlainPath $ShortcutDirectory
 $atlasShortcutPath = Join-Path $ShortcutDirectory $ShortcutName
 Assert-AtlasPlainPath $atlasShortcutPath
 $atlasHelper = Join-Path $atlasVersion 'app\install-shortcut.cjs'
 $atlasHelperArgs = @('"' + $atlasHelper + '"','"' + $atlasShortcutPath + '"',$AppId,'"' + $atlasData + '"')
 $atlasHelperProcess = Start-Process -FilePath (Join-Path $atlasVersion 'runtime\electron.exe') -ArgumentList $atlasHelperArgs -WorkingDirectory $atlasVersion -WindowStyle Hidden -PassThru
 if (-not $atlasHelperProcess.WaitForExit(20000)) { Stop-Process -Id $atlasHelperProcess.Id -ErrorAction SilentlyContinue; throw 'Start Menu shortcut setup timed out.' }
 if ($atlasHelperProcess.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $atlasShortcutPath)) { throw 'Start Menu shortcut setup failed.' }
}
$atlasInstalled = @{version=$atlasManifest.version;installationRoot=$atlasInstall;dataDirectory=$atlasData;appId=$AppId;shortcut=$atlasShortcutPath}
[IO.File]::WriteAllText((Join-Path $atlasVersion 'installed.json'),($atlasInstalled | ConvertTo-Json),(New-Object Text.UTF8Encoding $false))
$atlasStateFile = Join-Path $atlasData 'state.json'
if (-not $NoShortcuts -and $AppId -eq 'QuotaAtlas.Desktop' -and (Test-Path -LiteralPath $atlasStateFile)) {
 $atlasUserState = Get-Content -LiteralPath $atlasStateFile -Raw -Encoding UTF8 | ConvertFrom-Json
 if ($atlasUserState.settings.launchAtLogin -eq $true) {
  $atlasRunKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
  New-ItemProperty -LiteralPath $atlasRunKey -Name QuotaAtlas -PropertyType String -Value ('"' + (Join-Path $atlasVersion 'runtime\electron.exe') + '" "' + (Join-Path $atlasVersion 'app') + '"') -Force | Out-Null
 }
}
$atlasPlan | ConvertTo-Json
if (-not $NoLaunch) { & (Join-Path $atlasVersion 'start.ps1') }
