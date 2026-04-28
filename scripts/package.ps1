$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$repoRootPath = [System.IO.Path]::GetFullPath($repoRoot.Path)
$distDir = Join-Path $repoRootPath "dist"
$distFullPath = [System.IO.Path]::GetFullPath($distDir)

if (-not $distFullPath.StartsWith($repoRootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to write outside repository root: $distFullPath"
}

$manifestPath = Join-Path $repoRootPath "manifest.json"
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$version = $manifest.version
$xpiPath = Join-Path $distFullPath "zotero-annotai-$version.xpi"
$files = @(
    "manifest.json",
    "bootstrap.js",
    "prefs.js",
    "src/reader-selection.js"
)

foreach ($file in $files) {
    $source = Join-Path $repoRootPath $file
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Required package file is missing: $file"
    }
}

New-Item -ItemType Directory -Path $distFullPath -Force | Out-Null

if (Test-Path -LiteralPath $xpiPath) {
    Remove-Item -LiteralPath $xpiPath -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open($xpiPath, [System.IO.Compression.ZipArchiveMode]::Create)

try {
    foreach ($file in $files) {
        $source = Join-Path $repoRootPath $file
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $source, $file) | Out-Null
    }
}
finally {
    $archive.Dispose()
}

Write-Host "Created $xpiPath"
