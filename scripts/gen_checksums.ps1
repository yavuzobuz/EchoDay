$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root 'release\EchoDay-Release'
$dest = Join-Path $target 'CHECKSUMS.txt'

$lines = Get-ChildItem -Recurse -File $target | ForEach-Object {
  $h = Get-FileHash -Algorithm SHA256 $_.FullName
  '{0}  {1}' -f $h.Hash, $_.FullName
}

$lines | Out-File -Encoding utf8 $dest
Write-Host "Wrote checksums to $dest"
