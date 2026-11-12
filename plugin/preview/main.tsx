// Runs the plugin in a browser, outside Buzz: a stand-in host with real React and invented channels.
// For looking at the interface and taking screenshots; it is not part of the installed plugin.
//   ?view=panel   the channel side panel instead of the page
//   ?mode=dark    dark colours
//   ?compare=1    open with two channels side by side
//   ?live=1       a new invented message every few seconds
//   ?anon=1       names hidden: everyone shown by role and number
//   ?channel=ID   open on one of the invented channels (demo-flat, demo-study, demo-quiet, demo-empty)
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { apply } from '../src/index.tsx'
import { another, CHANNELS, MESSAGES, PROFILES } from './demo.ts'

const params = new URLSearchParams(location.search)
document.documentElement.setAttribute('data-color-mode', params.get('mode') === 'dark' ? 'dark' : 'light')

type Filter = { kinds?: number[]; '#h'?: string[]; authors?: string[]; limit: number }
const incoming = new Set<(messages: { channelId: string }[]) => void>()

const session = {
  async read(filters: Filter[]) {
    const f = filters[0]
    if (!(f.limit >= 1 && f.limit <= 500)) throw new Error('Relay read limit must be between 1 and 500')
    if (f.kinds?.includes(9)) return (MESSAGES[f['#h']?.[0] ?? ''] ?? []).slice(-f.limit)
    if (f.kinds?.includes(0)) return PROFILES.filter((p) => f.authors?.includes(p.pubkey))
    return []
  },
  channels: { list: () => ({ channels: CHANNELS }), subscribeList: () => () => {} },
  subscribeIncoming(listener: (messages: { channelId: string }[]) => void) {
    incoming.add(listener)
    return () => incoming.delete(listener)
  },
}

const registered: { page?: { component: React.ComponentType }; panel?: { component: React.ComponentType<{ channelContext: object }> } } = {}
apply({
  react: React,
  relay: { snapshot: () => ({ status: 'ready', session, scope: 'preview', generation: 1 }), subscribe: () => () => {} },
  pages: { register: (page: object) => (registered.page = page as never) },
  panels: { register: (panel: object) => (registered.panel = panel as never) },
} as never)

if (params.get('live')) {
  let n = 0
  setInterval(() => {
    MESSAGES['demo-coordinated'].push(another(n++))
    for (const listener of incoming) listener([{ channelId: 'demo-coordinated' }])
  }, 4000)
}

const Page = registered.page!.component
const Panel = registered.panel!.component
const root = createRoot(document.getElementById('root')!)
root.render(
  params.get('view') === 'panel' ? (
    <div className="preview-panel ui-card">
      <Panel channelContext={{ channelId: 'demo-flat', channelName: 'agents-without-coordinator' }} />
    </div>
  ) : (
    <Page />
  ),
)

// Press the page's own buttons once they are on screen.
const press = (label: string) => {
  const button = [...document.querySelectorAll('button')].find((b) => b.textContent === label)
  if (button) button.click()
  else requestAnimationFrame(() => press(label))
}
if (params.get('compare')) requestAnimationFrame(() => press('Compare'))
if (params.get('anon')) requestAnimationFrame(() => press('Hide names'))
if (params.get('channel')) {
  const choose = () => {
    const select = document.querySelector('select')
    if (!select) return void requestAnimationFrame(choose)
    select.value = params.get('channel')!
    select.dispatchEvent(new Event('change', { bubbles: true }))
  }
  requestAnimationFrame(choose)
}
