// The Coordination page: pick a channel, or two to compare, and see how its people and agents coordinate.
import { React } from './host.ts'
import { ChannelView, useMeasures } from './channel-view.tsx'
import { Compare } from './compare.tsx'
import { useChannelData, useChannels, useSession } from './hooks.ts'
import { Quiet } from './parts.tsx'
import type { Relay } from './read.ts'
import { snapshot } from './snapshot.ts'
import { clock, t, useRoleColors } from './theme.ts'

/** The page scrolls itself: Buzz gives a page its area and leaves padding and scrolling to it. */
function Frame({ children, content }: { children: React.ReactNode; content?: React.RefObject<HTMLDivElement> }) {
  return (
    <div style={{ height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div ref={content} data-coordination-page="" style={{ padding: t.inset, display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 1180, margin: '0 auto', boxSizing: 'border-box', color: t.text }}>{children}</div>
    </div>
  )
}

/** What was last chosen, kept while the app stays open (a plugin has no storage of its own). */
const chosen: { a?: string; b?: string; comparing?: boolean; anonymous?: boolean } = {}

export function CoordinationPage({ relay }: { relay: Relay }) {
  const session = useSession(relay)
  const { channels, supported } = useChannels(session)
  const colors = useRoleColors()
  const [a, setA] = React.useState(chosen.a)
  const [b, setB] = React.useState(chosen.b)
  const [comparing, setComparing] = React.useState(chosen.comparing ?? false)
  const [anonymous, setAnonymous] = React.useState(chosen.anonymous ?? false)
  Object.assign(chosen, { a, b, comparing, anonymous })
  const content = React.useRef<HTMLDivElement>(null)
  const [copied, setCopied] = React.useState<'' | 'Copied' | 'Could not copy'>('')

  // Fall back to the first channel when nothing is chosen or the choice is gone.
  const has = (id?: string) => !!id && channels.some((c) => c.id === id)
  const idA = has(a) ? a : channels[0]?.id
  const idB = comparing ? (has(b) && b !== idA ? b : channels.find((c) => c.id !== idA)?.id) : undefined
  const nameOf = (id?: string) => channels.find((c) => c.id === id)?.name ?? ''

  const left = useChannelData(session, idA)
  const right = useChannelData(session, idB)
  const leftMeasures = useMeasures(left)
  const rightMeasures = useMeasures(right)

  if (!session) return <Frame><h1 style={{ margin: 0 }}>Coordination</h1><Quiet>Connecting to the community…</Quiet></Frame>
  if (!supported) return <Frame><h1 style={{ margin: 0 }}>Coordination</h1><Quiet>This version of Buzz does not share its channel list with plugins. Update Buzz, then open this page again.</Quiet></Frame>
  if (!channels.length) return <Frame><h1 style={{ margin: 0 }}>Coordination</h1><Quiet>Join a channel in this community and it will appear here to measure.</Quiet></Frame>

  const picker = (value: string | undefined, set: (id: string) => void, label: string, skip?: string) => (
    <select aria-label={label} value={value ?? ''} onChange={(e) => set(e.target.value)} style={{ maxWidth: 240 }}>
      {channels.filter((c) => c.id !== skip).map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
    </select>
  )
  const refresh = () => {
    left.refresh()
    right.refresh()
  }
  // The whole page as one HTML file on the clipboard: the only thing this plugin ever writes.
  const copy = () => {
    if (!content.current) return
    const still = snapshot(content.current, comparing && idB ? `${nameOf(idA)} and ${nameOf(idB)}` : nameOf(idA))
    const done = (word: 'Copied' | 'Could not copy') => {
      setCopied(word)
      setTimeout(() => setCopied(''), 2500)
    }
    navigator.clipboard.writeText(still).then(() => done('Copied'), () => done('Could not copy'))
  }

  return (
    <Frame content={content}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>Coordination</h1>
          <p style={{ margin: '2px 0 0', color: t.subtle }}>How people and agents hand work to each other in a channel.</p>
        </div>
        <div data-controls="" style={{ display: 'flex', alignItems: 'center', gap: t.gap, flexWrap: 'wrap' }}>
          {picker(idA, setA, 'Channel')}
          {comparing && <span style={{ color: t.subtle }}>and</span>}
          {comparing && picker(idB, setB, 'Channel to compare with', idA)}
          {channels.length > 1 && (
            <button type="button" aria-pressed={comparing} onClick={() => setComparing(!comparing)}>
              {comparing ? 'Stop comparing' : 'Compare'}
            </button>
          )}
          <button type="button" aria-pressed={anonymous} title="Show everyone by role and number, for a screenshot that names nobody" onClick={() => setAnonymous(!anonymous)}>
            {anonymous ? 'Show names' : 'Hide names'}
          </button>
          <button type="button" title="Put a still of this whole page on the clipboard, as one HTML file" onClick={copy}>{copied || 'Copy as HTML'}</button>
          <button type="button" onClick={refresh}>Refresh</button>
          <span style={{ color: t.subtle, fontSize: 12, whiteSpace: 'nowrap' }} title="New messages are picked up as they arrive">
            {left.live ? '● Live' : ''}{left.readAt ? ` · read ${clock(left.readAt / 1000)}` : ''}
          </span>
        </div>
      </div>
      {comparing && idB ? (
        <>
          <Compare left={{ name: nameOf(idA), summary: leftMeasures?.summary }} right={{ name: nameOf(idB), summary: rightMeasures?.summary }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 420px', minWidth: 0 }}><ChannelView name={nameOf(idA)} state={left} colors={colors} compact anonymous={anonymous} /></div>
            <div style={{ flex: '1 1 420px', minWidth: 0 }}><ChannelView name={nameOf(idB)} state={right} colors={colors} compact anonymous={anonymous} /></div>
          </div>
        </>
      ) : (
        <ChannelView name={nameOf(idA)} state={left} colors={colors} anonymous={anonymous} />
      )}
      <p style={{ margin: 0, color: t.subtle, fontSize: 12 }}>
        Counts come from message order and mentions only; nothing reads what a message says. This plugin reads the channel and never posts.
      </p>
    </Frame>
  )
}
