// Two channels, one measure per row: the same definitions on both sides, so a difference is a
// difference in how the two teams coordinate.
import { React } from './host.ts'
import { Card } from './parts.tsx'
import { duration, numeric, percent, t } from './theme.ts'
import type { Summary } from '../../src/core/index.ts'

const ROWS: readonly [string, (s: Summary) => string][] = [
  ['Messages', (s) => String(s.messages.total)],
  ['From agents', (s) => percent(s.messages.agent, s.messages.total)],
  ['Handoffs', (s) => String(s.allHandoffs.total)],
  ['Handoffs answered', (s) => percent(s.allHandoffs.answered, s.allHandoffs.total)],
  ['Median reply', (s) => duration(s.allHandoffs.medianLatency)],
  ['Agent to agent, answered', (s) => percent(s.handoffs['agent→agent'].answered, s.handoffs['agent→agent'].total)],
  ['Human to agent, answered', (s) => percent(s.handoffs['human→agent'].answered, s.handoffs['human→agent'].total)],
  ['Longest agent run', (s) => String(s.longestAgentRun)],
  ['Agent loops', (s) => String(s.loops)],
  ['Human interventions', (s) => String(s.interventions)],
]

export function Compare({ left, right }: { left: { name: string; summary?: Summary }; right: { name: string; summary?: Summary } }) {
  const th: React.CSSProperties = { padding: '0 12px 8px 0', textAlign: 'left', fontWeight: 600, color: t.text }
  const td: React.CSSProperties = { ...numeric, padding: '7px 12px 7px 0', borderTop: `1px solid ${t.border}`, color: t.text }
  const value = (s: Summary | undefined, f: (s: Summary) => string) => (s ? f(s) : '…')
  return (
    <Card title="Side by side" note="Same measures, same definitions">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, fontWeight: 500, color: t.subtle, fontSize: 12 }}>Measure</th>
              <th style={th}>#{left.name}</th>
              <th style={th}>#{right.name}</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, f]) => (
              <tr key={label}>
                <td style={{ ...td, color: t.subtle }}>{label}</td>
                <td style={td}>{value(left.summary, f)}</td>
                <td style={td}>{value(right.summary, f)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
