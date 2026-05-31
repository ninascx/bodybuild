import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const publicDir = resolve(projectRoot, 'public')
const sourceIconPath = resolve(import.meta.dirname, 'app-icon-source.png')

function sourceIcon() {
  return sharp(sourceIconPath).rotate().flatten({ background: '#ffffff' })
}

async function pngIcon(size, outPath) {
  await sourceIcon()
    .resize(size, size, {
      fit: 'cover',
      position: 'center',
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outPath)
  console.log(`Generated ${outPath.replace(projectRoot, '').replace(/\\/g, '/')}`)
}

async function main() {
  await mkdir(publicDir, { recursive: true })

  await pngIcon(64, resolve(publicDir, 'favicon.png'))
  await pngIcon(192, resolve(publicDir, 'pwa-192x192.png'))
  await pngIcon(512, resolve(publicDir, 'pwa-512x512.png'))
  await pngIcon(512, resolve(publicDir, 'pwa-maskable-512x512.png'))
  await pngIcon(180, resolve(publicDir, 'apple-touch-icon.png'))

  console.log('Icon generation complete.')
}

main().catch((error) => {
  console.error('Icon generation failed:', error)
  process.exit(1)
})
