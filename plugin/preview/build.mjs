// Bundles the browser preview (plugin/preview/index.html) with real React and invented channels.
// Separate from the plugin build: nothing here reaches plugin/dist.
import { build } from 'esbuild'

const here = new URL('.', import.meta.url).pathname
await build({
  entryPoints: [`${here}main.tsx`],
  outfile: `${here}out/preview.js`,
  bundle: true,
  format: 'esm',
  target: 'es2022',
  jsx: 'transform',
  define: { 'process.env.NODE_ENV': '"development"' },
  legalComments: 'none',
})
console.log('built the preview: npm run preview, then open http://127.0.0.1:4418/')
