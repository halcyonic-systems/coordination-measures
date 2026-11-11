// Look and formatting. Surfaces, text and borders come from Buzz's own tokens, so the plugin
// follows the app's light and dark themes; each has a fallback for the browser preview.
// Only the two role colours are the plugin's own (Buzz: "plugin-owned color meanings").
import { React } from './host.ts'
import type { Role } from '../../src/core/index.ts'

export const t = {
  text: 'var(--text-standard, #2e3440)',
  subtle: 'var(--text-subtle, #4c566a)',
  border: 'var(--border-standard, #d8dee9)',
  panel: 'var(--surface-panel, #ffffff)',
  inset: 'var(--space-panel-inset, 16px)',
  gap: 'var(--space-2, 8px)',
} as const

/**
 * Human and agent, per colour mode. Checked with a palette validator against each mode's surface:
 * lightness band, chroma, colour-blind separation (worst pair 21.0 light, 22.0 dark) and 3:1
 * contrast all pass. Shape repeats the meaning everywhere: humans round, agents six-sided.
 */
const ROLE_COLORS: Record<'light' | 'dark', Record<Role, string>> = {
  light: { human: '#3B6FB6', agent: '#C8602A' },
  dark: { human: '#5A8AD6', agent: '#D2723C' },
}

/** Buzz sets `data-color-mode` on <html>; without it, follow the system. */
const currentMode = (): 'light' | 'dark' => {
  const set = document.documentElement.getAttribute('data-color-mode')
  if (set === 'dark' || set === 'light') return set
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useRoleColors(): Record<Role, string> {
  const [mode, setMode] = React.useState(currentMode)
  React.useEffect(() => {
    const update = () => setMode(currentMode())
    const seen = new MutationObserver(update)
    seen.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-mode'] })
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    media?.addEventListener('change', update)
    return () => {
      seen.disconnect()
      media?.removeEventListener('change', update)
    }
  }, [])
  return ROLE_COLORS[mode]
}

/** The width of an element, kept current, so a chart can fit its container without scrolling. */
export function useWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = React.useRef<HTMLDivElement>(null)
  const [width, setWidth] = React.useState(0)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const seen = new ResizeObserver(() => setWidth(el.clientWidth))
    seen.observe(el)
    setWidth(el.clientWidth)
    return () => seen.disconnect()
  }, [])
  return [ref, width]
}

export const duration = (sec: number | null): string => {
  if (sec === null) return 'n/a'
  if (sec < 90) return `${Math.round(sec)} s`
  if (sec < 90 * 60) return `${Math.round(sec / 60)} min`
  return `${(sec / 3600).toFixed(1)} h`
}
export const percent = (part: number, whole: number): string => (whole ? `${Math.round((100 * part) / whole)}%` : 'n/a')
export const clock = (at: number): string => new Date(at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
export const day = (at: number): string => new Date(at * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' })
export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`

/** A regular hexagon's points, flat top, for an agent's mark. */
export const hexagon = (cx: number, cy: number, r: number): string =>
  [0, 1, 2, 3, 4, 5].map((i) => `${(cx + r * Math.cos((Math.PI / 3) * i)).toFixed(2)},${(cy + r * Math.sin((Math.PI / 3) * i)).toFixed(2)}`).join(' ')

export const numeric: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' }
