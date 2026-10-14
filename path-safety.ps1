function Get-AtlasSha256([string]$Path) {
 $atlasHash = [Security.Cryptography.SHA256]::Create()
 $atlasStream = [IO.File]::OpenRead($Path)
 try { return [BitConverter]::ToString($atlasHash.ComputeHash($atlasStream)).Replace('-','').ToLowerInvariant() }
 finally { $atlasStream.Dispose(); $atlasHash.Dispose() }
}
function Import-AtlasProcessTools {
 if (-not (Get-Command Get-CimInstance -ErrorAction SilentlyContinue)) { Import-Module (Join-Path $PSHOME 'Modules\CimCmdlets\CimCmdlets.psd1') -ErrorAction Stop }
}
function Assert-AtlasPlainPath([string]$Path) {
 $atlasCheck = [IO.Path]::GetFullPath($Path)
 while ($atlasCheck) {
  if (Test-Path -LiteralPath $atlasCheck) {
   $atlasItem = Get-Item -LiteralPath $atlasCheck -Force
   if (($atlasItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Linked paths are not supported for installation or removal.' }
  }
  $atlasParent = [IO.Directory]::GetParent($atlasCheck)
  if ($null -eq $atlasParent) { break }
  $atlasCheck = $atlasParent.FullName
 }
}
function Assert-AtlasChild([string]$Path,[string]$Root) {
 $atlasChild = [IO.Path]::GetFullPath($Path).TrimEnd('\')
 $atlasRootPath = [IO.Path]::GetFullPath($Root).TrimEnd('\')
 if (-not $atlasChild.StartsWith($atlasRootPath + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'The selected path is outside the installation directory.' }
 Assert-AtlasPlainPath $atlasChild
 return $atlasChild
}
function Assert-AtlasPlainTree([string]$Path) {
 Assert-AtlasPlainPath $Path
 $atlasPending = New-Object 'System.Collections.Generic.Stack[string]'
 $atlasPending.Push([IO.Path]::GetFullPath($Path))
 while ($atlasPending.Count -gt 0) {
  foreach ($atlasEntry in [IO.Directory]::EnumerateFileSystemEntries($atlasPending.Pop())) {
   $atlasAttributes = [IO.File]::GetAttributes($atlasEntry)
   if (($atlasAttributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Linked content inside an installation prevents removal. No program files were removed.' }
   if (($atlasAttributes -band [IO.FileAttributes]::Directory) -ne 0) { $atlasPending.Push($atlasEntry) }
  }
 }
}
