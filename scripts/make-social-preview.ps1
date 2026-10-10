# Generates docs/assets/social-preview.png (1280x640) with System.Drawing.
# Instrument style: black, off-white, one amber signal. Deterministic output.
# Run from repo root:  powershell -File scripts/make-social-preview.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$W = 1280
$H = 640
$outPath = Join-Path $PSScriptRoot '..\docs\assets\social-preview.png'
$outPath = [System.IO.Path]::GetFullPath($outPath)

$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::Default
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

$bg     = [System.Drawing.Color]::FromArgb(11, 11, 11)
$ink    = [System.Drawing.Color]::FromArgb(230, 227, 220)
$dim    = [System.Drawing.Color]::FromArgb(138, 135, 127)
$faint  = [System.Drawing.Color]::FromArgb(85, 83, 77)
$lineH  = [System.Drawing.Color]::FromArgb(58, 58, 58)
$line   = [System.Drawing.Color]::FromArgb(38, 38, 38)
$amber  = [System.Drawing.Color]::FromArgb(255, 180, 84)
$red    = [System.Drawing.Color]::FromArgb(255, 95, 86)

$g.Clear($bg)

$mono = 'Consolas'
$brand    = New-Object System.Drawing.Font($mono, 54, [System.Drawing.FontStyle]::Bold)
$big      = New-Object System.Drawing.Font($mono, 40, [System.Drawing.FontStyle]::Bold)
$mid      = New-Object System.Drawing.Font($mono, 28, [System.Drawing.FontStyle]::Bold)
$small    = New-Object System.Drawing.Font($mono, 16, [System.Drawing.FontStyle]::Regular)
$smallB   = New-Object System.Drawing.Font($mono, 16, [System.Drawing.FontStyle]::Bold)
$tiny     = New-Object System.Drawing.Font($mono, 13, [System.Drawing.FontStyle]::Regular)

# border
$pen = New-Object System.Drawing.Pen($lineH, 1)
$g.DrawRectangle($pen, 16, 16, $W - 33, $H - 33)

function Draw-Text($text, $x, $y, $font, $color) {
    $brush = New-Object System.Drawing.SolidBrush($color)
    $g.DrawString($text, $font, $brush, $x, $y)
    $brush.Dispose()
}

# header row
Draw-Text 'bandpass' 48 48 $brand $ink
Draw-Text 'THE CONTEXT COMPILER FOR AI AGENTS' 400 66 $smallB $dim

# measurement line (real measured values from the bundled demo)
Draw-Text '33 SOURCES'   48 190 $mid $ink
Draw-Text [char]0x2192   268 190 $mid $dim
Draw-Text '19 SELECTED'  320 190 $mid $ink
Draw-Text [char]0x2192   580 190 $mid $dim
Draw-Text '864 TOKENS'   632 190 $mid $amber
Draw-Text '(est., measured — bench: 1435 in vs 517 out)' 900 198 $tiny $faint

# rejection ledger line
Draw-Text '14 REJECTED, ON THE RECORD:' 48 268 $small $dim
Draw-Text 'x stale Jenkins note'      48 300 $small $red
Draw-Text 'x duplicate region config' 350 300 $small $red
Draw-Text 'x hearsay rollback owner'  660 300 $small $red
Draw-Text 'x irrelevant x12 more'     962 300 $small $red

# hook
Draw-Text 'COMPILE CONTEXT.'        48 400 $big $amber
Draw-Text "DON'T CONCATENATE IT."   48 462 $big $ink

# spectrum band motif
$bandY = 548
$bandPen = New-Object System.Drawing.Pen($line, 1)
$g.DrawRectangle($bandPen, 48, $bandY, 640, 30)
$amberPen   = New-Object System.Drawing.Pen($amber, 2)
$faintPen   = New-Object System.Drawing.Pen($faint, 1)
$amberBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(14, 255, 180, 84))
$g.FillRectangle($amberBrush, 240, $bandY + 1, 448, 28)
$amberBrush.Dispose()
$hotX = @(280, 310, 345, 390, 428, 470, 515, 560, 612, 660)
foreach ($x in $hotX) { $g.DrawLine($amberPen, $x, ($bandY + 5), $x, ($bandY + 25)) }
$deadX = @(70, 92, 114, 136, 158, 180, 202)
foreach ($x in $deadX) { $g.DrawLine($faintPen, $x, ($bandY + 9), $x, ($bandY + 21)) }
Draw-Text 'PASSBAND = THE TASK' 700 ($bandY + 6) $tiny $amber

# footer
Draw-Text 'MCP · CONTEXT ENGINEERING · AGENT MEMORY · PROVENANCE' 48 596 $tiny $faint
Draw-Text 'github.com/MajidAsghariTabrizi/bandpass' 830 596 $tiny $dim

New-Item -ItemType Directory -Force -Path (Split-Path $outPath) | Out-Null
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "wrote $outPath ($W x $H)"
