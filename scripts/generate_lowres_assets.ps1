Add-Type -AssemblyName System.Drawing

$flagsDir = "public/flags"
$lowFlagsDir = "public/flags/low"

if (!(Test-Path $lowFlagsDir)) {
    New-Item -ItemType Directory -Path $lowFlagsDir -Force | Out-Null
}

$flagFiles = Get-ChildItem -Path "$flagsDir/*.png"
Write-Output "Found $($flagFiles.Count) flags. Generating 80px low-resolution versions..."

$targetFlagWidth = 80
$count = 0

foreach ($file in $flagFiles) {
    try {
        $img = [System.Drawing.Image]::FromFile($file.FullName)
        $w = $targetFlagWidth
        $h = [int][Math]::Max(1, [Math]::Round($img.Height * ($targetFlagWidth / $img.Width)))

        $dest = New-Object System.Drawing.Bitmap $w, $h
        $g = [System.Drawing.Graphics]::FromImage($dest)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

        $destRect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
        $g.DrawImage($img, $destRect, 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel)

        $outPath = Join-Path $lowFlagsDir $file.Name
        $dest.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

        $g.Dispose()
        $dest.Dispose()
        $img.Dispose()
        $count++
    }
    catch {
        Write-Error "Failed resizing $($file.Name): $_"
    }
}

Write-Output "Successfully generated $count low-resolution flags in $lowFlagsDir."

# Now generate low-resolution textures
$texturesDir = "public/textures"
$lowTexturesDir = "public/textures/low"

if (!(Test-Path $lowTexturesDir)) {
    New-Item -ItemType Directory -Path $lowTexturesDir -Force | Out-Null
}

Write-Output "Generating low-resolution 3D Earth textures..."

# Helper for JPEG compression encoder
function Save-Jpeg($image, $path, $quality) {
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
    $image.Save($path, $codec, $encoderParams)
}

# 1. Earth Blue Marble (original 4096x2048 -> low-res 1024x512)
if (Test-Path "$texturesDir/earth-blue-marble.jpg") {
    $img = [System.Drawing.Image]::FromFile((Resolve-Path "$texturesDir/earth-blue-marble.jpg").Path)
    $dest = New-Object System.Drawing.Bitmap 1024, 512
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, 1024, 512)
    Save-Jpeg $dest "$lowTexturesDir/earth-blue-marble.jpg" 80
    $g.Dispose()
    $dest.Dispose()
    $img.Dispose()
    Write-Output "Generated low-res earth-blue-marble.jpg"
}

# 2. Earth Topology (original 2048x1024 -> low-res 512x256)
if (Test-Path "$texturesDir/earth-topology.png") {
    $img = [System.Drawing.Image]::FromFile((Resolve-Path "$texturesDir/earth-topology.png").Path)
    $dest = New-Object System.Drawing.Bitmap 512, 256
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, 512, 256)
    $dest.Save("$lowTexturesDir/earth-topology.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $dest.Dispose()
    $img.Dispose()
    Write-Output "Generated low-res earth-topology.png"
}

# 3. Earth Night (original 4096x2048 -> low-res 1024x512)
if (Test-Path "$texturesDir/earth-night.jpg") {
    $img = [System.Drawing.Image]::FromFile((Resolve-Path "$texturesDir/earth-night.jpg").Path)
    $dest = New-Object System.Drawing.Bitmap 1024, 512
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, 1024, 512)
    Save-Jpeg $dest "$lowTexturesDir/earth-night.jpg" 80
    $g.Dispose()
    $dest.Dispose()
    $img.Dispose()
    Write-Output "Generated low-res earth-night.jpg"
}

Write-Output "All low-resolution assets generated successfully!"
