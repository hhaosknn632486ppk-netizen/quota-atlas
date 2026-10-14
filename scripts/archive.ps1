param([ValidateSet('Runtime','Pack','Extract')][string]$Mode,[string]$Source,[string]$Destination)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
if ($Mode -eq 'Pack') { [IO.Compression.ZipFile]::CreateFromDirectory($Source,$Destination,[IO.Compression.CompressionLevel]::Optimal,$false); return }
$atlasRoot = [IO.Path]::GetFullPath($Destination).TrimEnd('\')
if (Test-Path -LiteralPath $atlasRoot) { throw 'Extract into a new directory.' }
New-Item -ItemType Directory -Path $atlasRoot | Out-Null
$atlasArchive = [IO.Compression.ZipFile]::OpenRead($Source)
try {
 $atlasNames = @{}
 foreach ($atlasEntry in $atlasArchive.Entries) {
  $atlasRelative = $atlasEntry.FullName.Replace('/','\')
  if ([IO.Path]::IsPathRooted($atlasRelative) -or $atlasRelative -match '(^|\\)\.\.?([\\]|$)|:') { throw 'Unsafe archive entry.' }
  $atlasOutput = [IO.Path]::GetFullPath((Join-Path $atlasRoot $atlasRelative))
  if (-not $atlasOutput.StartsWith($atlasRoot + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Archive entry escapes extraction directory.' }
  if ($atlasNames.ContainsKey($atlasOutput)) { throw 'Duplicate archive entry.' }
  $atlasNames[$atlasOutput] = $true
  if ($atlasEntry.FullName.EndsWith('/')) { New-Item -ItemType Directory -Path $atlasOutput -Force | Out-Null; continue }
  New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($atlasOutput)) -Force | Out-Null
  [IO.Compression.ZipFileExtensions]::ExtractToFile($atlasEntry,$atlasOutput,$false)
 }
} finally { $atlasArchive.Dispose() }
