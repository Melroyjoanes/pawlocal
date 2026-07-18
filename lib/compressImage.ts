// Client-side photo compression before upload. Walker phones produce 5-12MB
// camera JPEGs; on Indian mobile upload bandwidth (often 1-3 Mbps) that's a
// 40-90 second upload that frequently times out — walkers reported poop-photo
// uploads taking over a minute, and failed uploads produced broken images on
// live reports. Downscaling to ~1280px JPEG cuts a typical photo to
// 150-400KB (~2-5s on 4G) with no visible quality loss at report-card size.
//
// Always returns SOMETHING uploadable: falls back to the original file if
// decoding/canvas fails (odd formats, ancient browsers) — compression is an
// optimization, never a gate.
export async function compressImage(file: File, maxDim = 1280, quality = 0.78): Promise<Blob> {
  try {
    // Already small enough — don't waste CPU re-encoding
    if (file.size < 400_000) return file

    let bitmap: ImageBitmap
    try {
      // Respect EXIF orientation so portrait photos don't upload sideways
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Older Safari throws on the options bag — retry without it
      bitmap = await createImageBitmap(file)
    }

    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    )
    // Only use the re-encode if it actually helped
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}
