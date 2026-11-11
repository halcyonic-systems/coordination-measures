// What the dashboard draws, as pure functions of the same messages and roster the measures use.
// Nothing here adds a new measure: each view regroups what metrics.ts defines (METRICS.md § Views).
import { agentRuns, handoffs, interventions, loops, ordered, roleOf } from './metrics.ts'
import { DEFAULTS, type Message, type Options, type Role, type Roster } from './types.ts'

export type Participant = {
  id: string
  role: Role
  messages: number
  /** Handoffs this participant started (mentions sent to someone else). */
  sent: number
  /** Handoffs addressed to this participant, and how many it answered within the window. */
  received: number
  answered: number
}

/** One row per author or mentioned person, most messages first. */
export function participants(messages: readonly Message[], roster: Roster, opts: Options = DEFAULTS): Participant[] {
  const by = new Map<string, Participant>()
  const get = (id: string) => {
    let p = by.get(id)
    if (!p) by.set(id, (p = { id, role: roleOf(roster, id), messages: 0, sent: 0, received: 0, answered: 0 }))
    return p
  }
  for (const m of messages) get(m.author).messages++
  for (const h of handoffs(messages, roster, opts)) {
    get(h.from).sent++
    const to = get(h.to)
    to.received++
    if (h.latency !== undefined) to.answered++
  }
  return [...by.values()].sort((a, b) => b.messages - a.messages || (a.id < b.id ? -1 : 1))
}

export type Edge = { from: string; to: string; handoffs: number; answered: number }

/** Who addressed whom: one directed edge per pair of participants, weighted by handoffs. */
export function edges(messages: readonly Message[], roster: Roster, opts: Options = DEFAULTS): Edge[] {
  const by = new Map<string, Edge>()
  for (const h of handoffs(messages, roster, opts)) {
    const key = `${h.from}\u0000${h.to}`
    const e = by.get(key) ?? { from: h.from, to: h.to, handoffs: 0, answered: 0 }
    e.handoffs++
    if (h.latency !== undefined) e.answered++
    by.set(key, e)
  }
  return [...by.values()]
}

export type Beat = {
  id: string
  author: string
  role: Role
  at: number
  /** Part of a loop: two agents going back and forth (METRICS.md § Measures). */
  inLoop: boolean
  /** A human message that ended an agent run of two or more. */
  intervention: boolean
  /** Mentions in this message that went unanswered within the window. */
  dropped: number
}

/** The channel as a sequence of beats, in the one order every measure reads. */
export function timeline(messages: readonly Message[], roster: Roster, opts: Options = DEFAULTS): Beat[] {
  const runs = agentRuns(messages, roster)
  const looped = new Set(loops(runs, opts).flatMap((r) => r.ids))
  const ended = new Set(interventions(runs).map((r) => r.endedBy!))
  const dropped = new Map<string, number>()
  for (const h of handoffs(messages, roster, opts)) if (h.latency === undefined) dropped.set(h.id, (dropped.get(h.id) ?? 0) + 1)
  return ordered(messages).map((m) => ({
    id: m.id, author: m.author, role: roleOf(roster, m.author), at: m.at,
    inLoop: looped.has(m.id), intervention: ended.has(m.id), dropped: dropped.get(m.id) ?? 0,
  }))
}
