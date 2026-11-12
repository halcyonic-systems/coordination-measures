// A still of the dashboard as one HTML file: what is on screen, with the styles the app gave it
// written onto each element, no scripts and no controls. It opens in any browser, prints to one
// image at full height (tools/capture.mjs), and lets an agent read what the page looked like in Buzz.

/** The app's colour and spacing tokens the plugin draws with (theme.ts); the still carries their values. */
const TOKENS = ['--text-standard', '--text-subtle', '--border-standard', '--surface-panel', '--space-panel-inset', '--space-2']

/** What decides how an element looks, apart from its size, which the layout works out again. */
const COPIED = [
  'display', 'box-sizing', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant-numeric', 'line-height', 'letter-spacing',
  'color', 'background-color', 'text-align', 'vertical-align', 'white-space', 'text-transform', 'opacity', 'box-shadow',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'align-items', 'justify-content', 'row-gap', 'column-gap',
  'grid-template-columns', 'table-layout', 'border-collapse', 'position',
]

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** The first colour behind an element that is not see-through. */
function backdrop(el: Element): string {
  for (let at: Element | null = el; at; at = at.parentElement) {
    const c = getComputedStyle(at).backgroundColor
    if (c && c !== 'transparent' && !/,\s*0\)$/.test(c)) return c
  }
  return '#ffffff'
}

export function snapshot(root: HTMLElement, title: string): string {
  const copy = root.cloneNode(true) as HTMLElement
  // Walk the two trees together: the copy gets what the original was computed to look like.
  const pairs: [Element, Element][] = [[root, copy]]
  for (let i = 0; i < pairs.length; i++) {
    const [from, to] = pairs[i]
    const svgPart = from instanceof SVGElement && from.tagName.toLowerCase() !== 'svg'
    if (!svgPart) {
      const seen = getComputedStyle(from)
      const style = (to as HTMLElement).style
      for (const name of COPIED) style.setProperty(name, seen.getPropertyValue(name))
    }
    for (let n = 0; n < from.children.length; n++) pairs.push([from.children[n], to.children[n]])
  }
  for (const el of [...copy.querySelectorAll('[data-controls]')]) el.remove()

  const seen = getComputedStyle(root)
  const tokens = TOKENS.map((name) => [name, seen.getPropertyValue(name).trim()]).filter(([, value]) => value)
  const [width, height] = [Math.ceil(root.getBoundingClientRect().width), Math.ceil(root.scrollHeight)]
  const mode = document.documentElement.getAttribute('data-color-mode') ?? ''
  copy.style.setProperty('margin', '0 auto')
  copy.style.setProperty('width', `${width}px`)
  copy.style.setProperty('max-width', 'none')
  return [
    '<!doctype html>',
    `<html lang="en" data-coordination-still="1" data-color-mode="${escape(mode)}" data-width="${width}" data-height="${height}" data-title="${escape(title)}" data-taken="${new Date().toISOString()}">`,
    `<head><meta charset="utf-8"><title>Coordination: ${escape(title)}</title>`,
    `<style>:root{${tokens.map(([name, value]) => `${name}:${value}`).join(';')}}html,body{margin:0;background:${backdrop(root)}}</style></head>`,
    `<body>${copy.outerHTML}</body></html>`,
  ].join('\n')
}
