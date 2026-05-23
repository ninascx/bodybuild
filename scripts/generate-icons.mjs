// 生成 PWA 图标：Twemoji 🥊 + 深色圆角背景
// 用法: node scripts/generate-icons.mjs
import sharp from 'sharp'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const publicDir = resolve(projectRoot, 'public')
const sourceSvg = resolve(import.meta.dirname, 'boxing-glove-twemoji.svg')

const BG = '#0f172a' // slate-950，跟应用主色一致

// 提取 Twemoji 内部 path，剥掉外层 <svg> 包装
async function loadGlovePaths() {
  const raw = await readFile(sourceSvg, 'utf8')
  const inner = raw.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  return inner
}

function buildSvg(paths, size, padding, radius) {
  const inner = size - padding * 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${BG}"/>
  <g transform="translate(${padding} ${padding}) scale(${inner / 36})">
    ${paths}
  </g>
</svg>`
}

async function svgToPng(svg, size, outPath) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath)
  console.log(`  ✓ ${outPath.replace(projectRoot, '').replace(/\\/g, '/')}`)
}

async function main() {
  await mkdir(publicDir, { recursive: true })
  const paths = await loadGlovePaths()

  // favicon.svg：浏览器标签
  const faviconSvg = buildSvg(paths, 64, 8, 12)
  await writeFile(resolve(publicDir, 'favicon.svg'), faviconSvg, 'utf8')
  console.log(`  ✓ /public/favicon.svg`)

  // PWA 图标 PNG（圆角约 18%，安全区 padding 约 12%）
  await svgToPng(buildSvg(paths, 192, 24, 36), 192, resolve(publicDir, 'pwa-192x192.png'))
  await svgToPng(buildSvg(paths, 512, 64, 96), 512, resolve(publicDir, 'pwa-512x512.png'))

  // maskable 图标：填满整个 512×512，emoji 缩小到 60% 留出安全区
  await svgToPng(buildSvg(paths, 512, 102, 0), 512, resolve(publicDir, 'pwa-maskable-512x512.png'))

  // Apple touch icon
  await svgToPng(buildSvg(paths, 180, 22, 32), 180, resolve(publicDir, 'apple-touch-icon.png'))

  console.log('\n图标生成完成。')
}

main().catch((error) => {
  console.error('生成失败：', error)
  process.exit(1)
})
