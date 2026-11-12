// One channel, measured: every view over the same messages, each computed by the core.
import { React } from './host.ts'
import type { ChannelState } from './hooks.ts'
import { Network } from './network.tsx'
import { Pairings, Tiles } from './overview.tsx'
import { Card, Legend, Quiet } from './parts.tsx'
import { People } from './people.tsx'
import { clock, day, duration, t } from './theme.ts'
import { Timeline } from './timeline.tsx'
import { MESSAGE_LIMIT } from './read.ts'
import { edges, handoffs, labels, participants, shortId, summarize, timeline, type Role, type Summary } from '../../src/core/index.ts'

/** Everything drawn for a channel, computed once per read. */
export function useMeasures(state: ChannelState, anonymous = false) {
  return React.useMemo(() => {
    const d = state.data
    if (!d) return undefined
    const people = participants(d.messages, d.roster)
    const shown = labels(people, d.names, anonymous)
    return {
      summary: summarize(d.messages, d.roster),
      people,
      edges: edges(d.messages, d.roster),
      beats: timeline(d.messages, d.roster),
      handoffs: handoffs(d.messages, d.roster),
      names: (id: string) => shown[id] ?? shortId(id),
      capped: d.capped,
    }
  }, [state.data, anonymous])
}

const spanText = (s: Summary): string => {
  if (!s.span) return ''
  const { from, to } = s.span
  if (day(from) !== day(to)) return `${day(from)} to ${day(to)}`
  return clock(from) === clock(to) ? `${day(from)}, ${clock(from)}` : `${day(from)}, ${clock(from)} to ${clock(to)}`
}

export function ChannelView({ name, state, colors, compact = false, anonymous = false }: { name: string; state: ChannelState; colors: Record<Role, string>; compact?: boolean; anonymous?: boolean }) {
  const m = useMeasures(state, anonymous)
  const column: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: t.gap, minWidth: 0 }

  if (!m) {
    return (
      <div style={column}>
        <h2 style={{ margin: 0 }}>#{name}</h2>
        <Quiet>{state.status === 'error' ? `Could not read this channel: ${state.error}` : 'Reading the channel…'}</Quiet>
      </div>
    )
  }
  const s = m.summary
  return (
    <div style={column}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: t.gap, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>#{name}</h2>
        <span style={{ display: 'inline-flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', color: t.subtle, fontSize: 12 }}>
          {spanText(s)}
          {s.messages.total > 0 && <Legend colors={colors} />}
        </span>
      </div>
      {state.status === 'error' && <Quiet>Showing the last good read. The latest one failed: {state.error}</Quiet>}
      {s.messages.total === 0 ? (
        <Quiet>No messages in this channel yet. Counts appear as people and agents talk.</Quiet>
      ) : (
        <>
          <Tiles summary={s} colors={colors} />
          {/* Without a mention there is no handoff to pair or draw; the tile above says so. */}
          {s.allHandoffs.total > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: t.gap }}>
            <div style={{ flex: compact ? '1 1 100%' : '1 1 380px', minWidth: 0 }}>
              <Card title="Who hands off to whom" note={`Answered within ${duration(s.options.handoffWindow)}`}>
                <Pairings summary={s} colors={colors} />
              </Card>
            </div>
            <div style={{ flex: compact ? '1 1 100%' : '1 1 380px', minWidth: 0 }}>
              <Card title="Handoff network">
                <Network people={m.people} edges={m.edges} names={m.names} colors={colors} />
              </Card>
            </div>
          </div>}
          <Card title="Timeline">
            <Timeline beats={m.beats} handoffs={m.handoffs} names={m.names} colors={colors} />
          </Card>
          <Card title="People">
            <People people={m.people} names={m.names} colors={colors} handoffs={s.allHandoffs.total > 0} />
          </Card>
          {m.capped && <Quiet>Measured over the latest {MESSAGE_LIMIT} messages, the most Buzz returns in one read.</Quiet>}
        </>
      )}
    </div>
  )
}
