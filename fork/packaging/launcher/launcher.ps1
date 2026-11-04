<#
  Fast portable launcher. Expects next to it a single "<Product>-<version>-win.zip" produced by the build.
  The first run of each version extracts it once to %LOCALAPPDATA%\<Product>-portable\<version>; later runs
  start the extracted executable directly, so nothing is unpacked (or rescanned by antivirus) on every start.
  User data stays in %APPDATA%\<Product>, shared with the installed app.
#>
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

$zip = Get-ChildItem -Path $here -Filter '*-win.zip' | Sort-Object LastWriteTime | Select-Object -Last 1
if (-not $zip) { throw "No application package (*-win.zip) found in $here" }

$product, $version = ($zip.BaseName -replace '-win$', '') -split '-', 2
$root = Join-Path $env:LOCALAPPDATA "$product-portable"
$target = Join-Path $root $version
$exe = Join-Path $target "$product.exe"

# Fast path: already extracted, start right away.
if (Test-Path $exe) {
  Start-Process -FilePath $exe -WorkingDirectory $target
  exit 0
}

Add-Type -AssemblyName System.Windows.Forms, System.Drawing, System.IO.Compression.FileSystem

function Show-Message([string]$text) {
  $form = New-Object System.Windows.Forms.Form
  $form.Text = $product
  $form.FormBorderStyle = 'FixedDialog'
  $form.ControlBox = $false
  $form.StartPosition = 'CenterScreen'
  $form.Size = New-Object System.Drawing.Size(420, 120)
  $form.TopMost = $true
  $label = New-Object System.Windows.Forms.Label
  $label.Text = $text
  $label.Dock = 'Fill'
  $label.TextAlign = 'MiddleCenter'
  $label.Font = New-Object System.Drawing.Font('Segoe UI', 10)
  $form.Controls.Add($label)
  $form.Show()
  $form.Refresh()
  return $form
}

# One extraction at a time, even if the launcher is double-clicked twice.
$mutex = New-Object System.Threading.Mutex($false, "Local\$product-portable-launcher")
[void]$mutex.WaitOne()
try {
  if (-not (Test-Path $exe)) {
    $form = Show-Message "Preparing $product $version...`nThis only happens the first time."
    try {
      $staging = "$target.partial"
      if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
      [System.IO.Compression.ZipFile]::ExtractToDirectory($zip.FullName, $staging)
      Rename-Item -Path $staging -NewName (Split-Path $target -Leaf)
    } finally {
      $form.Close()
    }

    # Older extracted versions are removed when they are not in use.
    Get-ChildItem -Path $root -Directory |
      Where-Object { $_.Name -ne $version -and $_.Name -notlike '*.partial' } |
      ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
  }
} finally {
  $mutex.ReleaseMutex()
}

Start-Process -FilePath $exe -WorkingDirectory $target
