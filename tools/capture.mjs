// Turns a still from the plugin's "Copy as HTML" into files: the HTML itself and one image of the
// whole page at full height.
//   npm run capture                 the still on the clipboard (macOS)
//   npm run capture -- still.html   a still already saved
// Files go to captures/, which git ignores: a still of a real channel may name real people.
// The image needs Chrome; set CHROME to its path if it is not in the usual place.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const given = process.argv[2]
const html = given ? readFileSync(given, 'utf8') : execFileSync('pbpaste', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const head = /<html[^>]*data-coordination-still="1"[^>]*>/.exec(html)?.[0]
if (!head) {
  console.error(given ? `${given} is not a still from the plugin.` : 'The clipboard does not hold a still. In Buzz, open Coordination and press Copy as HTML first.')
  process.exit(1)
}
const attr = (name) => new RegExp(`data-${name}="([^"]*)"`).exec(head)?.[1] ?? ''
const slug = attr('title').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'channel'
const stamp = attr('taken').replace(/[-:]/g, '').replace('T', '-').slice(0, 13)
const dir = resolve(new URL('../captures/', import.meta.url).pathname)
mkdirSync(dir, { recursive: true })
const file = `${dir}/${slug}-${stamp}.html`
writeFileSync(file, html)
console.log(file)

const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
if (!existsSync(chrome)) {
  console.error('No image: Chrome was not found. Open the HTML file in a browser, or set CHROME.')
  process.exit(0)
}
const image = file.replace(/\.html$/, '.png')
const [width, height] = [Number(attr('width')) || 1180, Number(attr('height')) || 1600]
execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', `--window-size=${width},${height}`, `--screenshot=${image}`, `file://${file}`], { stdio: 'ignore' })
console.log(image)
