// Builds the plugin into plugin/dist (manifest.json + one self-contained plugin.js, the form Buzz
// installs from a folder or a Git repository), then runs the
// rule check; a build that breaks a rule is deleted, never left installable.
import { build } from 'esbuild'
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const here = new URL('.', import.meta.url).pathname
const dist = `${here}dist`

rmSync(dist, { recursive: true, force: true })
mkdirSync(dist)

await build({
  entryPoints: [`${here}src/index.tsx`],
  outfile: `${dist}/plugin.js`,
  bundle: true,
  format: 'esm',
  target: 'es2022',
  jsx: 'transform', // classic: React.createElement against the host's React (src/host.ts)
  legalComments: 'none',
})
copyFileSync(`${here}manifest.json`, `${dist}/manifest.json`)
// Buzz's conventional files beside the build: the user guide, and an icon when there is one.
for (const extra of ['README.md', 'icon.png']) if (existsSync(`${here}${extra}`)) copyFileSync(`${here}${extra}`, `${dist}/${extra}`)

try {
  execFileSync(process.execPath, [`${here}check.mjs`, dist], { stdio: 'inherit' })
} catch {
  rmSync(dist, { recursive: true, force: true })
  process.exit(1)
}
console.log(`built ${dist}: install it from Buzz → Settings → Plugins → Manage plugins → Choose folder; after a rebuild, use Update`)
