// Small shared pieces: the role mark, a card with a heading, a stat tile, the role legend.
import { React } from './host.ts'
import { hexagon, numeric, t } from './theme.ts'
import type { Role } from '../../src/core/index.ts'

/** Humans round, agents six-sided: the shape carries the role wherever the colour does. */
export function RoleMark({ role, color, size = 12, hollow = false }: { role: Role; color: string; size?: number; hollow?: boolean }) {
  const c = size / 2
  const paint = hollow ? { fill: 'none', stroke: color, strokeWidth: 1.5 } : { fill: color }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ display: 'inline-block', flex: 'none', verticalAlign: '-1px' }}>
      {role === 'agent' ? <polygon points={hexagon(c, c, c - 1)} {...paint} /> : <circle cx={c} cy={c} r={c - 1.25} {...paint} />}
    </svg>
  )
}

export function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="ui-card" style={{ padding: t.inset, minWidth: 0, height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: t.gap, flexWrap: 'wrap', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        {note && <span style={{ color: t.subtle, fontSize: 12 }}>{note}</span>}
      </div>
      {children}
    </section>
  )
}

export function Tile({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div style={{ flex: '1 1 150px', minWidth: 0, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}>
      <div style={{ color: t.subtle, fontSize: 12 }}>{label}</div>
      <div style={{ ...numeric, color: t.text, fontSize: 26, fontWeight: 600, lineHeight: 1.25 }}>{value}</div>
      <div style={{ color: t.subtle, fontSize: 12, minHeight: 16 }}>{children}</div>
    </div>
  )
}

export function Legend({ colors }: { colors: Record<Role, string> }) {
  const item = (role: Role, label: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <RoleMark role={role} color={colors[role]} /> {label}
    </span>
  )
  return (
    <span style={{ display: 'inline-flex', gap: 12, color: t.subtle, fontSize: 12 }}>
      {item('human', 'Human')}
      {item('agent', 'Agent')}
    </span>
  )
}

/** One line for a section with nothing to draw yet. */
export const Quiet = ({ children }: { children: React.ReactNode }) => <p style={{ margin: 0, color: t.subtle }}>{children}</p>
