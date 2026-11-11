// Who addresses whom: people on a ring, one curved arrow per direction, thicker with more handoffs.
import { React } from './host.ts'
import { Quiet } from './parts.tsx'
import { hexagon, plural, t } from './theme.ts'
import type { Edge, Participant, Role } from '../../src/core/index.ts'

const W = 420
const H = 300
/** More people than this and the ring stops being readable; the quietest fold away. */
const MAX_NODES = 12

export function Network({ people, edges, names, colors }: { people: readonly Participant[]; edges: readonly Edge[]; names: (id: string) => string; colors: Record<Role, string> }) {
  const [focus, setFocus] = React.useState<string | null>(null)
  const linked = new Set(edges.flatMap((e) => [e.from, e.to]))
  const shown = people.filter((p) => linked.has(p.id)).slice(0, MAX_NODES)
  if (!shown.length) return <Quiet>No handoffs yet. A handoff is a message that mentions someone.</Quiet>

  const cx = W / 2
  const cy = H / 2 - 6
  const ring = shown.length === 1 ? 0 : Math.min(cx - 86, cy - 44)
  const most = Math.max(...shown.map((p) => p.messages), 1)
  const at = new Map(
    shown.map((p, i) => {
      // Two people sit side by side; more go round a ring from the top.
      const a = (2 * Math.PI * i) / shown.length + (shown.length === 2 ? Math.PI : -Math.PI / 2)
      return [p.id, { x: cx + ring * Math.cos(a), y: cy + ring * Math.sin(a), r: 9 + 9 * Math.sqrt(p.messages / most), a, p }] as const
    }),
  )
  const drawn = edges.filter((e) => at.has(e.from) && at.has(e.to))
  const heaviest = Math.max(...drawn.map((e) => e.handoffs), 1)
  const dim = (ids: string[]) => (focus && !ids.includes(focus) ? 0.15 : 1)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Who hands off to whom" style={{ width: '100%', maxWidth: 560, height: 'auto', display: 'block', margin: '0 auto' }}>
        {drawn.map((e) => {
          const a = at.get(e.from)!
          const b = at.get(e.to)!
          const dx = b.x - a.x
          const dy = b.y - a.y
          const len = Math.hypot(dx, dy) || 1
          // Start and end on the marks' edges, and bow to one side so the two directions stay apart.
          const [ux, uy] = [dx / len, dy / len]
          const [sx, sy] = [a.x + ux * (a.r + 3), a.y + uy * (a.r + 3)]
          const [ex, ey] = [b.x - ux * (b.r + 7), b.y - uy * (b.r + 7)]
          const bow = Math.min(34, len * 0.18)
          const [mx, my] = [(sx + ex) / 2 - uy * bow, (sy + ey) / 2 + ux * bow]
          const role = a.p.role
          // One more handoff, a little thicker; past a handful, scaled to the busiest pair.
          const width = heaviest <= 7 ? 1.5 + 0.75 * (e.handoffs - 1) : 1.5 + (4.5 * (e.handoffs - 1)) / (heaviest - 1)
          // The arrowhead, drawn along the curve's direction where it arrives.
          const [tx, ty] = [ex - mx, ey - my]
          const tl = Math.hypot(tx, ty) || 1
          const [vx, vy] = [tx / tl, ty / tl]
          const head = 5 + width * 1.4
          const tip = [ex + vx * 3, ey + vy * 3]
          const base = [tip[0] - vx * head, tip[1] - vy * head]
          const wing = head * 0.5
          const points = [tip, [base[0] - vy * wing, base[1] + vx * wing], [base[0] + vy * wing, base[1] - vx * wing]].map((q) => q.map((n) => n.toFixed(1)).join(',')).join(' ')
          return (
            <g key={`${e.from}>${e.to}`} opacity={0.8 * dim([e.from, e.to])}>
              <path
                d={`M${sx.toFixed(1)},${sy.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${(ex - vx * head * 0.6).toFixed(1)},${(ey - vy * head * 0.6).toFixed(1)}`}
                fill="none"
                stroke={colors[role]}
                strokeWidth={width}
                strokeLinecap="round"
                strokeDasharray={e.answered === 0 ? `1 ${(width + 3).toFixed(1)}` : undefined}
              />
              <polygon points={points} fill={colors[role]} />
              <title>{`${names(e.from)} to ${names(e.to)}: ${plural(e.handoffs, 'handoff')}, ${e.answered} answered`}</title>
            </g>
          )
        })}
        {[...at.values()].map(({ x, y, r, a, p }) => {
          // Names sit outside the ring, on the side their mark is on.
          const out = shown.length === 1 ? { x, y: y + r + 16, anchor: 'middle' as const } : { x: x + Math.cos(a) * (r + 8), y: y + Math.sin(a) * (r + 8) + 4, anchor: Math.cos(a) > 0.3 ? ('start' as const) : Math.cos(a) < -0.3 ? ('end' as const) : ('middle' as const) }
          const label = names(p.id)
          return (
            <g key={p.id} opacity={dim([p.id, ...drawn.filter((e) => e.from === p.id || e.to === p.id).flatMap((e) => [e.from, e.to])])} onMouseEnter={() => setFocus(p.id)} onMouseLeave={() => setFocus(null)} style={{ cursor: 'default' }}>
              {/* The ring in the surface colour keeps a mark legible where an arrow passes. */}
              {p.role === 'agent' ? <polygon points={hexagon(x, y, r + 1)} fill={colors.agent} stroke={t.panel} strokeWidth={2} /> : <circle cx={x} cy={y} r={r} fill={colors.human} stroke={t.panel} strokeWidth={2} />}
              <circle cx={x} cy={y} r={r + 8} fill="transparent" />
              <text x={out.x} y={out.y + (Math.abs(Math.cos(a)) <= 0.3 && shown.length > 1 ? (Math.sin(a) > 0 ? 10 : -4) : 0)} textAnchor={out.anchor} fontSize={12} fill={t.text}>
                {label.length > 16 ? `${label.slice(0, 15)}…` : label}
              </text>
              <title>{`${label} (${p.role}): ${plural(p.messages, 'message')}, ${p.sent} handoffs sent, ${p.answered} of ${p.received} received answered`}</title>
            </g>
          )
        })}
      </svg>
      <p style={{ margin: '8px 0 0', color: t.subtle, fontSize: 12 }}>
        An arrow points from the person mentioning to the person mentioned; thicker means more handoffs, dotted means none were answered. A mark grows with messages.
        {people.filter((p) => linked.has(p.id)).length > MAX_NODES && ` Showing the ${MAX_NODES} most active.`}
      </p>
    </div>
  )
}
