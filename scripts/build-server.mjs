import { build } from 'esbuild'

await build({
  entryPoints: ['server/index.ts'],
  outfile: 'dist-server/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node20'],
  packages: 'external',
  sourcemap: false,
  minify: false,
  logLevel: 'info',
})
