export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') // needed to avoid cross-origin issues
    image.src = url
  })

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  // To ensure the app stays extremely fast and doesn't lag from 4K/12MP mobile photos,
  // we cap the output resolution of the cropped profile picture to 512x512.
  const targetSize = 512;
  canvas.width = targetSize;
  canvas.height = targetSize;

  // Enhance image smoothing for precise and high-quality downscaling
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetSize,
    targetSize
  )

  // Return as base64 JPEG instead of WebP to prevent massive PNG fallbacks on iOS Safari
  return canvas.toDataURL('image/jpeg', 0.8)
}
