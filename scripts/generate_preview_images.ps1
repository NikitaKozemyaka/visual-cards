$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$socialDir = Join-Path $root "social"
if (-not (Test-Path $socialDir)) {
    New-Item -ItemType Directory -Path $socialDir | Out-Null
}

function New-Brush([string]$hex) {
    return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function New-Pen([string]$hex, [float]$width = 1) {
    return New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($hex)), $width
}

function Draw-RoundedRect($graphics, $brush, $pen, [int]$x, [int]$y, [int]$w, [int]$h, [int]$r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    if ($brush) { $graphics.FillPath($brush, $path) }
    if ($pen) { $graphics.DrawPath($pen, $path) }
    $path.Dispose()
}

function Save-Png($bitmap, [string]$path) {
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function U([string]$base64) {
    return [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($base64))
}

function New-Canvas {
    $bmp = New-Object System.Drawing.Bitmap 1200, 630
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    return @{ Bitmap = $bmp; Graphics = $g }
}

function Write-Text($g, [string]$text, [string]$fontName, [float]$size, [string]$style, [string]$color, [float]$x, [float]$y) {
    $fontStyle = [System.Drawing.FontStyle]::$style
    $font = New-Object System.Drawing.Font($fontName, $size, $fontStyle)
    $brush = New-Brush $color
    $g.DrawString($text, $font, $brush, $x, $y)
    $font.Dispose()
    $brush.Dispose()
}

function Build-SitePreview([string]$path) {
    $canvas = New-Canvas
    $bmp = $canvas.Bitmap
    $g = $canvas.Graphics

    $bg = New-Brush "#08111b"
    $g.FillRectangle($bg, 0, 0, 1200, 630)
    $bg.Dispose()
    $glow1 = New-Brush "#10243c"
    $g.FillEllipse($glow1, -60, -120, 680, 420)
    $glow1.Dispose()
    $glow2 = New-Brush "#1c2e44"
    $g.FillEllipse($glow2, 760, 0, 360, 220)
    $glow2.Dispose()

    Draw-RoundedRect $g (New-Brush "#122033") (New-Pen "#28445f" 1.5) 70 70 1060 490 26

    Write-Text -g $g -text (U "0JLQuNC30YPQsNC70YzQvdGL0LUg0LrQsNGA0YLQvtGH0LrQuCBTVFc=") -fontName "Segoe UI" -size 30 -style "Bold" -color "#eef4fb" -x 110 -y 110
    Write-Text -g $g -text (U "0JrQvtC80L/QsNC60YLQvdGL0LUg0LrQsNGA0YLQvtGH0LrQuCDQv9C+INC80LXRhdCw0L3QuNC60LDQvA==") -fontName "Segoe UI" -size 18 -style "Regular" -color "#95a7ba" -x 110 -y 158

    Draw-RoundedRect $g (New-Brush "#1c2a3d") (New-Pen "#2b425c" 1) 110 220 420 240 20
    Write-Text -g $g -text (U "0JzQvtC00YPQu9C4INC4INC/0YDQtdC00LzQtdGC0Ys=") -fontName "Segoe UI" -size 18 -style "Bold" -color "#5eb8ff" -x 140 -y 250
    Write-Text -g $g -text (U "0JLQuNC30YPQsNC70YzQvdGL0LUg0LrQsNGA0YLQvtGH0LrQuA==") -fontName "Segoe UI" -size 28 -style "Bold" -color "#eef4fb" -x 140 -y 290
    Write-Text -g $g -text (U "0JHRi9GB0YLRgNGL0Lkg0LLRhdC+0LQg0LIg0LzQtdGF0LDQvdC40LrRgw==") -fontName "Segoe UI" -size 17 -style "Regular" -color "#95a7ba" -x 140 -y 345
    Write-Text -g $g -text (U "0J7RgtC60YDRi9C7LCDQvdCw0LbQsNC7LCDQv9C+0L3Rj9C7") -fontName "Segoe UI" -size 17 -style "Regular" -color "#95a7ba" -x 140 -y 375

    Draw-RoundedRect $g (New-Brush "#101a29") (New-Pen "#26415c" 1) 600 180 440 290 20
    Draw-RoundedRect $g (New-Brush "#253245") (New-Pen "#365170" 1) 640 225 120 34 17
    Write-Text -g $g -text (U "0JvQldCT0JXQndCU0JDQoNCd0KvQmQ==") -fontName "Segoe UI" -size 12 -style "Bold" -color "#d4a440" -x 650 -y 234
    Draw-RoundedRect $g (New-Brush "#253245") (New-Pen "#365170" 1) 772 225 100 34 17
    Write-Text -g $g -text (U "0KLQkNCa0KLQmNCn0JXQodCa0JjQmQ==") -fontName "Segoe UI" -size 12 -style "Bold" -color "#9cb0c3" -x 782 -y 234
    Write-Text -g $g -text (U "0KHRgtCw0LfQuNGBLdGP0LrQvtGA0Yw=") -fontName "Segoe UI" -size 34 -style "Bold" -color "#eef4fb" -x 640 -y 285
    Write-Text -g $g -text (U "0J7RgtC60YDQvtC5INC60LDRgNGC0L7Rh9C60YMg0Lgg0YHRgNCw0LfRgyDQttC80Lg=") -fontName "Segoe UI" -size 18 -style "Regular" -color "#95a7ba" -x 640 -y 338
    Write-Text -g $g -text (U "0J7RgtC60YDRi9C7INGB0YLRgNCw0L3QuNGG0YMg0Lgg0YHRgNCw0LfRgyDRg9Cy0LjQtNC10Lsg0LjRgtC+0LM=") -fontName "Segoe UI" -size 17 -style "Regular" -color "#95a7ba" -x 640 -y 372
    Draw-RoundedRect $g (New-Brush "#152538") (New-Pen "#244e76" 1) 640 412 250 34 17
    Write-Text -g $g -text (U "0JrQvtC80L/QsNC60YLQvdGL0Lkg0LzQvtC00YPQu9GM") -fontName "Segoe UI" -size 14 -style "Bold" -color "#63b6ff" -x 660 -y 419

    Write-Text -g $g -text "Space Text World" -fontName "Segoe UI" -size 14 -style "Regular" -color "#778b9f" -x 110 -y 520

    Save-Png $bmp $path
    $g.Dispose()
    $bmp.Dispose()
}

function Build-StasisPreview([string]$path) {
    $canvas = New-Canvas
    $bmp = $canvas.Bitmap
    $g = $canvas.Graphics

    $bg = New-Brush "#070b14"
    $g.FillRectangle($bg, 0, 0, 1200, 630)
    $bg.Dispose()
    $glow1 = New-Brush "#132740"
    $g.FillEllipse($glow1, 760, -70, 360, 220)
    $glow1.Dispose()
    $glow2 = New-Brush "#3d3214"
    $g.FillEllipse($glow2, -40, 390, 320, 220)
    $glow2.Dispose()

    Draw-RoundedRect $g (New-Brush "#121c2b") (New-Pen "#2d4055" 1.5) 70 70 1060 490 26

    Draw-RoundedRect $g (New-Brush "#2b2414") (New-Pen "#5c4a1e" 1) 110 112 145 38 19
    Write-Text -g $g -text (U "0JvQldCT0JXQndCU0JDQoNCd0KvQmQ==") -fontName "Segoe UI" -size 12 -style "Bold" -color "#d4a440" -x 120 -y 120
    Draw-RoundedRect $g (New-Brush "#1f2733") (New-Pen "#39485a" 1) 270 112 120 38 19
    Write-Text -g $g -text (U "0KLQkNCa0KLQmNCn0JXQodCa0JjQmQ==") -fontName "Segoe UI" -size 12 -style "Bold" -color "#a3b5c5" -x 280 -y 120

    Write-Text -g $g -text (U "0KHRgtCw0LfQuNGBLdGP0LrQvtGA0Yw=") -fontName "Segoe UI" -size 46 -style "Bold" -color "#eef4fb" -x 110 -y 190
    Write-Text -g $g -text (U "0JHRi9GB0YLRgNGL0Lkg0YHQuNC80YPQu9GP0YLQvtGAINC80L7QtNGD0LvRjw==") -fontName "Segoe UI" -size 22 -style "Regular" -color "#91a3b7" -x 110 -y 248
    Write-Text -g $g -text (U "0J/QsNGB0YHQuNCyOiAtMSUg0YPQutC70L7QvdC10L3QuNGPINC30LAg0YPRgNC+0LLQtdC90Yw=") -fontName "Segoe UI" -size 24 -style "Regular" -color "#eef4fb" -x 110 -y 320
    Write-Text -g $g -text (U "L3Bpbjog0YHQuNC70YzQvdC10LUg0YDQtdC20LXRgiBkb2RnZSDQtNC+INCx0L7Rjw==") -fontName "Segoe UI" -size 24 -style "Bold" -color "#5eb8ff" -x 110 -y 360
    Write-Text -g $g -text (U "TDEtTDkgIOKAoiAg0YPQutC70L7QvdC10L3QuNC1INCy0YDQsNCz0LAgIOKAoiAg0YjQsNC90YEg0L/QvtC/0LDQtNCw0L3QuNGP") -fontName "Segoe UI" -size 20 -style "Regular" -color "#91a3b7" -x 110 -y 424

    Draw-RoundedRect $g (New-Brush "#0e1826") (New-Pen "#2a4561" 1) 740 175 290 86 18
    Write-Text -g $g -text (U "0J/RgNC40LzQtdGA") -fontName "Segoe UI" -size 16 -style "Regular" -color "#91a3b7" -x 770 -y 195
    Write-Text -g $g -text (U "TDMgKyAvcGluINC/0YDQvtGC0LjQsiAyMCU=") -fontName "Segoe UI" -size 26 -style "Bold" -color "#eef4fb" -x 770 -y 222

    Draw-RoundedRect $g (New-Brush "#0e1826") (New-Pen "#2a4561" 1) 740 290 290 132 22
    Write-Text -g $g -text (U "0KPQutC70L7QvdC10L3QuNC1INCy0YDQsNCz0LAg0L/QvtGB0LvQtSDQutCw0YDRgtGL") -fontName "Segoe UI" -size 18 -style "Regular" -color "#91a3b7" -x 770 -y 320
    Write-Text -g $g -text "2%" -fontName "Segoe UI" -size 56 -style "Bold" -color "#63d3a7" -x 770 -y 350

    Draw-RoundedRect $g (New-Brush "#18273a") (New-Pen "#396187" 1) 740 448 290 46 18
    Write-Text -g $g -text (U "0J3QsNC20LzQuCDQuCDRgdGA0LDQt9GDINGD0LLQuNC00LjRiNGMINC40YLQvtCz") -fontName "Segoe UI" -size 15 -style "Bold" -color "#bfe0ff" -x 760 -y 462

    Save-Png $bmp $path
    $g.Dispose()
    $bmp.Dispose()
}

Build-SitePreview (Join-Path $socialDir "site-preview.png")
Build-StasisPreview (Join-Path $socialDir "stasis-anchor-preview.png")
Copy-Item (Join-Path $socialDir "site-preview.png") (Join-Path $root "site-preview.png") -Force
Copy-Item (Join-Path $socialDir "stasis-anchor-preview.png") (Join-Path $root "stasis-anchor-preview.png") -Force
Write-Output "Generated preview PNGs in social/"
