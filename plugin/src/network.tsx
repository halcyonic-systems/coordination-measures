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
  const busiest = people.filter((p) => linked.has(p.id)).slice(0, MAX_NODES)
  // Humans together, then agents, each still busiest first.
  const shown = [...busiest.filter((p) => p.role === 'human'), ...busiest.filter((p) => p.role === 'agent')]
  if (!shown.length) return <Quiet>No handoffs yet. A handoff is a message that mentions someone.</Quiet>

  const cx = W / 2
  const cy = H / 2 - 6
  const n = shown.length
  const humans = shown.filter((p) => p.role === 'human').length
  const ring = n === 1 ? 0 : Math.min(cx - 86, cy - 44)
  const most = Math.max(...shown.map((p) => p.messages), 1)
  // Humans sit on the left of the ring and agents on the right, like the table beside it;
  // a channel of one role alone starts from the top.
  const start = n === 2 || (humans > 0 && humans < n) ? Math.PI - (Math.PI * (humans - 1)) / n : -Math.PI / 2
  const at = new Map(
    shown.map((p, i) => {
      const a = start + (2 * Math.PI * i) / n
      return [p.id, { x: cx + ring * Math.cos(a), y: cy + ring * Math.sin(a), r: 9 + 9 * Math.sqrt(p.messages / most), a, p }] as const
    }),
  )
  const drawn = edges.filter((e) => at.has(e.from) && at.has(e.to))
  const heaviest = Math.max(...drawn.map((e) => e.handoffs), 1)
  const dim = (ids: string[]) => (focus && !ids.includes(focus) ? 0.15 : 1)
  const f = (v: number) => v.toFixed(1)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Who hands off to whom" style={{ width: '100%', maxWidth: 560, height: 'auto', display: 'block', margin: '0 auto' }}>
        {drawn.map((e) => {
          const a = at.get(e.from)!
          const b = at.get(e.to)!
          const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
          const [ux, uy] = [(b.x - a.x) / len, (b.y - a.y) / len]
          // The curve bows to one side, and leaves and arrives on that side of each mark, so the
          // two directions between a pair never share a point.
          const bow = Math.min(40, len * 0.22)
          const [mx, my] = [(a.x + b.x) / 2 - uy * bow, (a.y + b.y) / 2 + ux * bow]
          const toward = (p: { x: number; y: number }) => {
            const d = Math.hypot(mx - p.x, my - p.y) || 1
            return [(mx - p.x) / d, (my - p.y) / d]
          }
          const [ax, ay] = toward(a)
          const [bx, by] = toward(b)
          const role = a.p.role
          // One more handoff, a little thicker; past a handful, scaled to the busiest pair.
          const width = heaviest <= 7 ? 1.5 + 0.75 * (e.handoffs - 1) : 1.5 + (4.5 * (e.handoffs - 1)) / (heaviest - 1)
          const head = 4 + width * 1.2
          const wing = head * 0.5
          const [sx, sy] = [a.x + ax * (a.r + 3), a.y + ay * (a.r + 3)]
          const tip = [b.x + bx * (b.r + 3), b.y + by * (b.r + 3)]
          const base = [tip[0] + bx * head, tip[1] + by * head]
          const points = [tip, [base[0] - by * wing, base[1] + bx * wing], [base[0] + by * wing, base[1] - bx * wing]].map((q) => q.map(f).join(',')).join(' ')
          const d = `M${f(sx)},${f(sy)} Q${f(mx)},${f(my)} ${f(base[0] - bx * head * 0.3)},${f(base[1] - by * head * 0.3)}`
          const share = e.answered / e.handoffs
          return (
            <g key={`${e.from}>${e.to}`} opacity={dim([e.from, e.to])}>
              {/* Share answered, as in the table: the solid part on a lighter track of the same hue. */}
              <path d={d} fill="none" stroke={colors[role]} strokeWidth={width} strokeLinecap="round" opacity={0.28} />
              {share > 0 && <path d={d} fill="none" stroke={colors[role]} strokeWidth={width} strokeLinecap={share < 1 ? 'butt' : 'round'} pathLength={100} strokeDasharray={share < 1 ? `${f(share * 100)} 100` : undefined} opacity={0.85} />}
              <polygon points={points} fill={colors[role]} opacity={share === 1 ? 0.85 : 0.4} />
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
        An arrow points from the person mentioning to the person mentioned. Thicker means more handoffs; the solid part is the share answered. A mark grows with messages.
        {busiest.length < people.filter((p) => linked.has(p.id)).length && ` Showing the ${MAX_NODES} most active.`}
      </p>
    </div>
  )
}
