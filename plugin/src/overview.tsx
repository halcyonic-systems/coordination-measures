// The headline figures for one channel, and the 2 by 2 of who hands off to whom.
import { React } from './host.ts'
import { RoleMark, Tile } from './parts.tsx'
import { duration, numeric, percent, plural, t, useWidth } from './theme.ts'
import type { Role, Summary } from '../../src/core/index.ts'

export function Tiles({ summary: s, colors }: { summary: Summary; colors: Record<Role, string> }) {
  const { human, agent, total } = s.messages
  // Four across, two by two, or a single column: never a row with one tile left over.
  const [ref, width] = useWidth()
  const columns = width >= 620 ? 4 : width >= 300 || !width ? 2 : 1
  // A flex row keeps a mark beside its count whatever the host's styles make of an inline svg.
  const count: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }
  return (
    <div ref={ref} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: t.gap }}>
      <Tile label="Messages" value={String(total)}>
        {total > 0 && (
          <span title={`${human} from humans, ${agent} from agents`}>
            {/* One whole split in two; the 2px gap, not a border, separates the parts. */}
            <span style={{ display: 'flex', gap: 2, height: 6, margin: '4px 0 6px' }}>
              {human > 0 && <span style={{ flex: human, background: colors.human, borderRadius: 3 }} />}
              {agent > 0 && <span style={{ flex: agent, background: colors.agent, borderRadius: 3 }} />}
            </span>
            <span style={{ display: 'flex', columnGap: 6, flexWrap: 'wrap' }}>
              <span style={count}><RoleMark role="human" color={colors.human} size={10} /> {human} human</span>
              <span style={count}><RoleMark role="agent" color={colors.agent} size={10} /> {agent} agent</span>
            </span>
          </span>
        )}
      </Tile>
      {s.allHandoffs.total ? (
        <Tile label="Handoffs answered" value={percent(s.allHandoffs.answered, s.allHandoffs.total)}>
          {s.allHandoffs.answered} of {plural(s.allHandoffs.total, 'handoff')}
          {s.allHandoffs.medianLatency !== null && ` · median reply ${duration(s.allHandoffs.medianLatency)}`}
        </Tile>
      ) : (
        <Tile label="Handoffs" value="0">
          a handoff is a message that mentions someone
        </Tile>
      )}
      <Tile label="Agent loops" value={String(s.loops)}>
        {s.options.loopLength}+ messages back and forth · longest agent run {s.longestAgentRun}
      </Tile>
      <Tile label="Human interventions" value={String(s.interventions)}>
        a human stepping into an agent run unasked
      </Tile>
    </div>
  )
}

const ROLES: readonly Role[] = ['human', 'agent']

/** Who hands off to whom, by role: rows address, columns are addressed. */
export function Pairings({ summary: s, colors }: { summary: Summary; colors: Record<Role, string> }) {
  const cell: React.CSSProperties = { padding: '10px 12px', borderTop: `1px solid ${t.border}`, verticalAlign: 'top', textAlign: 'left' }
  const head: React.CSSProperties = { padding: '0 12px 8px', textAlign: 'left', fontWeight: 500, color: t.subtle, fontSize: 12 }
  const role = (r: Role, prefix: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
      {prefix} <RoleMark role={r} color={colors[r]} /> {r === 'human' ? 'a human' : 'an agent'}
    </span>
  )
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <thead>
        <tr>
          <th style={{ ...head, width: '26%' }} />
          {ROLES.map((to) => <th key={to} style={head}>{role(to, 'to')}</th>)}
        </tr>
      </thead>
      <tbody>
        {ROLES.map((from) => (
          <tr key={from}>
            <th scope="row" style={{ ...cell, fontWeight: 500, color: t.subtle, fontSize: 12 }}>{role(from, 'From')}</th>
            {ROLES.map((to) => {
              const p = s.handoffs[`${from}→${to}`]
              if (!p.total) return <td key={to} style={{ ...cell, color: t.subtle }}>None yet</td>
              return (
                <td key={to} style={cell}>
                  <div style={{ ...numeric, fontSize: 20, fontWeight: 600, color: t.text }}>
                    {p.total} <span style={{ fontSize: 12, fontWeight: 400, color: t.subtle }}>{p.total === 1 ? 'handoff' : 'handoffs'}</span>
                  </div>
                  {/* Share answered: the fill on a lighter track of the same hue. */}
                  <div style={{ position: 'relative', height: 6, borderRadius: 3, margin: '6px 0', overflow: 'hidden' }} title={`${p.answered} of ${p.total} answered`}>
                    <div style={{ position: 'absolute', inset: 0, background: colors[from], opacity: 0.2 }} />
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(100 * p.answered) / p.total}%`, background: colors[from], borderRadius: 3 }} />
                  </div>
                  <div style={{ ...numeric, color: t.subtle, fontSize: 12 }}>
                    {percent(p.answered, p.total)} answered{p.medianLatency !== null && ` · ${duration(p.medianLatency)} median`}
                  </div>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
