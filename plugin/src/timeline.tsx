// The channel in order: one lane per person, one mark per message, a thin line for each answered
// handoff, a band where agents looped, a ring where a human stepped in.
import { React } from './host.ts'
import { Quiet } from './parts.tsx'
import { clock, day, hexagon, t, useWidth } from './theme.ts'
import type { Beat, Handoff, Role } from '../../src/core/index.ts'

const LANE = 26
const TOP = 20
const GUTTER = 118
const STEP = 9
const MAX_LANES = 8
const OTHERS = '\u0000others'

export function Timeline({ beats, handoffs, names, colors }: { beats: readonly Beat[]; handoffs: readonly Handoff[]; names: (id: string) => string; colors: Record<Role, string> }) {
  const [ref, width] = useWidth()
  if (!beats.length) return <Quiet>No messages yet.</Quiet>

  // As many of the latest messages as fit at a readable spacing; never a scroll bar.
  const fit = Math.max(12, Math.floor((width - GUTTER - 12) / STEP))
  const shown = beats.slice(-fit)
  const step = shown.length > 1 ? Math.min(40, (Math.max(width, 320) - GUTTER - 12) / (shown.length - 1)) : 0

  const counts = new Map<string, number>()
  for (const b of shown) counts.set(b.author, (counts.get(b.author) ?? 0) + 1)
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
  const roleOfLane = new Map(shown.map((b) => [b.author, b.role] as const))
  // The busiest get a lane each, humans above agents; the rest share one at the bottom.
  const kept = ranked.length > MAX_LANES ? ranked.slice(0, MAX_LANES - 1) : ranked
  const byRole = (role: Role) => kept.filter((id) => roleOfLane.get(id) === role)
  const lanes = [...byRole('human'), ...byRole('agent'), ...(ranked.length > MAX_LANES ? [OTHERS] : [])]
  const laneOf = (author: string) => Math.max(0, lanes.indexOf(lanes.includes(author) ? author : OTHERS))

  const x = (i: number) => GUTTER + i * step
  const y = (lane: number) => TOP + lane * LANE + LANE / 2
  const height = TOP + lanes.length * LANE + 22
  // The axis is message order, so only its two ends carry a time.
  const [first, last] = [shown[0], shown[shown.length - 1]]
  const when = (at: number) => (day(first.at) === day(last.at) ? clock(at) : day(at))
  const index = new Map(shown.map((b, i) => [b.id, i] as const))

  // Stretches of consecutive loop messages, as [first, last] positions.
  const bands: [number, number][] = []
  shown.forEach((b, i) => {
    if (!b.inLoop) return
    const last = bands[bands.length - 1]
    if (last && last[1] === i - 1) last[1] = i
    else bands.push([i, i])
  })

  return (
    <div ref={ref} style={{ minWidth: 0 }}>
      {width > 0 && (
        <svg width="100%" height={height} role="img" aria-label="Messages in order, one lane per person" style={{ display: 'block' }}>
          {bands.map(([a, b], n) => (
            <g key={a}>
              <rect x={x(a) - 6} y={TOP - 2} width={x(b) - x(a) + 12} height={lanes.length * LANE + 4} rx={4} fill={t.text} opacity={0.07} />
              {/* The label names the band; a neighbour too close to fit beside it goes without its count. */}
              <text x={x(a) - 4} y={12} fontSize={11} fill={t.subtle}>
                {n + 1 < bands.length && x(bands[n + 1][0]) - x(a) < 130 ? '↻ loop' : `↻ loop, ${b - a + 1} messages`}
              </text>
            </g>
          ))}
          {lanes.map((id, i) => (
            <g key={id}>
              <line x1={GUTTER - 8} x2="100%" y1={y(i)} y2={y(i)} stroke={t.border} strokeWidth={1} />
              <text x={GUTTER - 14} y={y(i) + 4} textAnchor="end" fontSize={12} fill={t.text}>
                {id === OTHERS ? `${ranked.length - MAX_LANES + 1} others` : names(id).length > 15 ? `${names(id).slice(0, 14)}…` : names(id)}
              </text>
            </g>
          ))}
          <text x={GUTTER} y={height - 4} fontSize={11} fill={t.subtle}>{when(first.at)}</text>
          {shown.length > 1 && when(last.at) !== when(first.at) && <text x={x(shown.length - 1)} y={height - 4} textAnchor="end" fontSize={11} fill={t.subtle}>{when(last.at)}</text>}
          {handoffs.map((h) => {
            const from = index.get(h.id)
            const to = h.answeredBy ? index.get(h.answeredBy) : undefined
            if (from === undefined || to === undefined) return null
            return <line key={`${h.id}>${h.to}`} x1={x(from)} y1={y(laneOf(h.from))} x2={x(to)} y2={y(laneOf(h.to))} stroke={colors[roleOfLane.get(h.from) ?? 'human']} strokeWidth={1.25} opacity={0.4} />
          })}
          {shown.map((b, i) => {
            const [cx, cy] = [x(i), y(laneOf(b.author))]
            // A message whose handoff went unanswered is drawn hollow.
            const paint = b.dropped ? { fill: t.panel, stroke: colors[b.role], strokeWidth: 1.75 } : { fill: colors[b.role], stroke: t.panel, strokeWidth: 1.5 }
            const notes = [b.inLoop && 'in a loop', b.intervention && 'stepped into an agent run unasked', b.dropped && 'handoff not answered'].filter(Boolean)
            return (
              <g key={b.id}>
                {b.intervention && <circle cx={cx} cy={cy} r={8.5} fill="none" stroke={t.text} strokeWidth={1.25} />}
                {b.role === 'agent' ? <polygon points={hexagon(cx, cy, 5)} {...paint} /> : <circle cx={cx} cy={cy} r={4.5} {...paint} />}
                <circle cx={cx} cy={cy} r={Math.max(6, step / 2)} fill="transparent">
                  <title>{`${names(b.author)} · ${clock(b.at)}${notes.length ? ` · ${notes.join(', ')}` : ''}`}</title>
                </circle>
              </g>
            )
          })}
        </svg>
      )}
      <p style={{ margin: '8px 0 0', color: t.subtle, fontSize: 12 }}>
        {shown.length < beats.length ? `The latest ${shown.length} of ${beats.length} messages` : beats.length === 1 ? 'The one message so far' : `All ${beats.length} messages`}, in order from the left, evenly spaced whatever the time between them. A line joins a mention to its answer. Shaded: two agents going back and forth. Hollow: a handoff nobody answered. Ringed: a human stepping in unasked.
      </p>
    </div>
  )
}
