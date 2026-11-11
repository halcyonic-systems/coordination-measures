// The table view: every figure the charts draw, per person, in text.
import { React } from './host.ts'
import { RoleMark } from './parts.tsx'
import { numeric, percent, t } from './theme.ts'
import type { Participant, Role } from '../../src/core/index.ts'

export function People({ people, names, colors }: { people: readonly Participant[]; names: (id: string) => string; colors: Record<Role, string> }) {
  const th: React.CSSProperties = { padding: '0 10px 8px 0', textAlign: 'left', fontWeight: 500, color: t.subtle, fontSize: 12, whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { ...numeric, padding: '7px 10px 7px 0', borderTop: `1px solid ${t.border}`, color: t.text, whiteSpace: 'nowrap' }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Person</th>
            <th style={th}>Messages</th>
            <th style={th}>Sent</th>
            <th style={th}>Received</th>
            <th style={th}>Answered</th>
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id}>
              <td style={{ ...td, whiteSpace: 'nowrap' }}>
                <RoleMark role={p.role} color={colors[p.role]} /> {names(p.id)} <span style={{ color: t.subtle, fontSize: 12 }}>{p.role}</span>
              </td>
              <td style={td}>{p.messages}</td>
              <td style={td}>{p.sent}</td>
              <td style={td}>{p.received}</td>
              <td style={td} title={p.received ? `${p.answered} of ${p.received} answered` : undefined}>{percent(p.answered, p.received)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
