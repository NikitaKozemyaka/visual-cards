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

    Write-Text $g "Визуальные карточки STW" "Segoe UI" 30 "Bold" "#eef4fb" 110 110
    Write-Text $g "Понятные гайды по модулям и предметам" "Segoe UI" 18 "Regular" "#95a7ba" 110 158

    Draw-RoundedRect $g (New-Brush "#1c2a3d") (New-Pen "#2b425c" 1) 110 220 420 240 20
    Write-Text $g "Модули и предметы" "Segoe UI" 18 "Bold" "#5eb8ff" 140 250
    Write-Text $g "Визуальные карточки" "Segoe UI" 28 "Bold" "#eef4fb" 140 290
    Write-Text $g "Понятные примеры, механики," "Segoe UI" 17 "Regular" "#95a7ba" 140 345
    Write-Text $g "уровни и эффекты" "Segoe UI" 17 "Regular" "#95a7ba" 140 375

    Draw-RoundedRect $g (New-Brush "#101a29") (New-Pen "#26415c" 1) 600 180 440 290 20
    Draw-RoundedRect $g (New-Brush "#253245") (New-Pen "#365170" 1) 640 225 120 34 17
    Write-Text $g "ЛЕГЕНДАРНЫЙ" "Segoe UI" 12 "Bold" "#d4a440" 650 234
    Draw-RoundedRect $g (New-Brush "#253245") (New-Pen "#365170" 1) 772 225 100 34 17
    Write-Text $g "ТАКТИЧЕСКИЙ" "Segoe UI" 12 "Bold" "#9cb0c3" 782 234
    Write-Text $g "Стазис-якорь" "Segoe UI" 34 "Bold" "#eef4fb" 640 285
    Write-Text $g "Открой карточку и быстро разберись" "Segoe UI" 18 "Regular" "#95a7ba" 640 338
    Write-Text $g "каталог сайта + отдельные гайды" "Segoe UI" 17 "Regular" "#95a7ba" 640 372
    Draw-RoundedRect $g (New-Brush "#152538") (New-Pen "#244e76" 1) 640 412 250 34 17
    Write-Text $g "гайды по игре в одном месте" "Segoe UI" 14 "Bold" "#63b6ff" 660 419

    Write-Text $g "Space Text World" "Segoe UI" 14 "Regular" "#778b9f" 110 520

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
    Write-Text $g "ЛЕГЕНДАРНЫЙ" "Segoe UI" 12 "Bold" "#d4a440" 120 120
    Draw-RoundedRect $g (New-Brush "#1f2733") (New-Pen "#39485a" 1) 270 112 120 38 19
    Write-Text $g "ТАКТИЧЕСКИЙ" "Segoe UI" 12 "Bold" "#a3b5c5" 280 120

    Write-Text $g "Стазис-якорь" "Segoe UI" 46 "Bold" "#eef4fb" 110 190
    Write-Text $g "Визуальная карточка модуля" "Segoe UI" 22 "Regular" "#91a3b7" 110 248
    Write-Text $g "Пассив: -1% уклонения за уровень" "Segoe UI" 24 "Regular" "#eef4fb" 110 320
    Write-Text $g "/pin: сильнее режет dodge до боя" "Segoe UI" 24 "Bold" "#5eb8ff" 110 360
    Write-Text $g "L1-L9  •  уклонение врага  •  шанс попадания" "Segoe UI" 20 "Regular" "#91a3b7" 110 424

    Draw-RoundedRect $g (New-Brush "#0e1826") (New-Pen "#2a4561" 1) 740 175 290 86 18
    Write-Text $g "Пример" "Segoe UI" 16 "Regular" "#91a3b7" 770 195
    Write-Text $g "L3 + /pin против 20%" "Segoe UI" 26 "Bold" "#eef4fb" 770 222

    Draw-RoundedRect $g (New-Brush "#0e1826") (New-Pen "#2a4561" 1) 740 290 290 132 22
    Write-Text $g "Уклонение врага после карты" "Segoe UI" 18 "Regular" "#91a3b7" 770 320
    Write-Text $g "2%" "Segoe UI" 56 "Bold" "#63d3a7" 770 350

    Draw-RoundedRect $g (New-Brush "#18273a") (New-Pen "#396187" 1) 740 448 290 46 18
    Write-Text $g "Открой страницу и потыкай значения" "Segoe UI" 15 "Bold" "#bfe0ff" 760 462

    Save-Png $bmp $path
    $g.Dispose()
    $bmp.Dispose()
}

Build-SitePreview (Join-Path $socialDir "site-preview.png")
Build-StasisPreview (Join-Path $socialDir "stasis-anchor-preview.png")
Copy-Item (Join-Path $socialDir "site-preview.png") (Join-Path $root "site-preview.png") -Force
Copy-Item (Join-Path $socialDir "stasis-anchor-preview.png") (Join-Path $root "stasis-anchor-preview.png") -Force
Write-Output "Generated preview PNGs in social/"
