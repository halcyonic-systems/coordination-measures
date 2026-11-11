// The process measures, as pure functions of one channel's messages and a roster. Every definition
// here is stated in METRICS.md; change one, change the other in the same commit.
import { DEFAULTS, PAIRS, type Message, type Options, type Pair, type Role, type Roster } from './types.ts'

export const roleOf = (roster: Roster, author: string): Role => roster[author] ?? 'human'
export const pairOf = (from: Role, to: Role): Pair => `${from}→${to}`

/** Messages in time order, ties broken by id, so every measure sees one sequence. */
export const ordered = (messages: readonly Message[]): Message[] =>
  [...messages].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

export type Handoff = {
  from: string
  to: string
  pair: Pair
  /** The mentioning message. */
  id: string
  at: number
  /** The first later message by the mentioned author within the window, if any. */
  answeredBy?: string
  latency?: number
}

/** A handoff: a message mentions someone else. Answered when that person speaks next within the window. */
export function handoffs(messages: readonly Message[], roster: Roster, opts: Options = DEFAULTS): Handoff[] {
  const seq = ordered(messages)
  const out: Handoff[] = []
  seq.forEach((m, i) => {
    for (const to of new Set(m.mentions)) {
      if (to === m.author) continue
      const answer = seq.slice(i + 1).find((n) => n.author === to && n.at - m.at <= opts.handoffWindow)
      out.push({
        from: m.author, to, pair: pairOf(roleOf(roster, m.author), roleOf(roster, to)), id: m.id, at: m.at,
        ...(answer ? { answeredBy: answer.id, latency: answer.at - m.at } : {}),
      })
    }
  })
  return out
}

export type AgentRun = {
  /** Ids of the consecutive agent messages, in order, and who wrote each. */
  ids: string[]
  authors: string[]
  /** How many different agents took part. */
  agents: number
  /** The human message that ended the run, if one did. */
  endedBy?: string
  /** That human had been mentioned during the run: they were asked, they did not step in. */
  asked?: true
}

/** Maximal stretches of consecutive agent messages with no human message between them. */
export function agentRuns(messages: readonly Message[], roster: Roster): AgentRun[] {
  const runs: AgentRun[] = []
  let ids: string[] = []
  let authors: string[] = []
  let mentioned = new Set<string>()
  const close = (ender?: Message) => {
    if (ids.length) {
      runs.push({ ids, authors, agents: new Set(authors).size, ...(ender ? { endedBy: ender.id } : {}), ...(ender && mentioned.has(ender.author) ? { asked: true as const } : {}) })
    }
    ids = []
    authors = []
    mentioned = new Set()
  }
  for (const m of ordered(messages)) {
    if (roleOf(roster, m.author) === 'agent') {
      ids.push(m.id)
      authors.push(m.author)
      for (const to of m.mentions) mentioned.add(to)
    } else close(m)
  }
  close()
  return runs
}

export type Loop = {
  /** Ids of the back-and-forth messages, in order. */
  ids: string[]
  /** The two agents alternating. */
  agents: [string, string]
}

/**
 * A loop: two agents alternating, one message each in turn, for at least `loopLength` messages
 * with no human and no third agent between. Longer cycles (three agents in rotation) are not
 * detected (METRICS.md § What version 0 does not do).
 */
export function loops(runs: readonly AgentRun[], opts: Options = DEFAULTS): Loop[] {
  const out: Loop[] = []
  for (const run of runs) {
    let start = 0
    const flush = (end: number) => {
      // [start, end) alternates between two agents.
      if (end - start >= opts.loopLength) out.push({ ids: run.ids.slice(start, end), agents: [run.authors[start], run.authors[start + 1]] })
    }
    for (let i = 1; i <= run.authors.length; i++) {
      const alternates = i < run.authors.length && run.authors[i] !== run.authors[i - 1] && (i - start < 2 || run.authors[i] === run.authors[i - 2])
      if (alternates) continue
      flush(i)
      // A third agent breaks the pattern but may begin the next one with its neighbour.
      start = i < run.authors.length && run.authors[i] !== run.authors[i - 1] ? i - 1 : i
    }
  }
  return out
}

/**
 * A human intervention: a human message that ends an agent run of two or more messages when no
 * message in that run mentioned them. A human answering an agent's mention is an answered
 * handoff, counted there, not an intervention.
 */
export const interventions = (runs: readonly AgentRun[]) => runs.filter((r) => r.endedBy && !r.asked && r.ids.length >= 2)

const median = (xs: number[]): number | null => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export type Summary = {
  messages: { total: number; human: number; agent: number }
  handoffs: Record<Pair, { total: number; answered: number; medianLatency: number | null }>
  /** Every handoff, whatever the pairing. */
  allHandoffs: { total: number; answered: number; medianLatency: number | null }
  /** First and last message time, Unix seconds; null for an empty channel. */
  span: { from: number; to: number } | null
  longestAgentRun: number
  loops: number
  interventions: number
  options: Options
}

/** Every measure for one channel, in one object: what the plugin shows and the CLI prints. */
export function summarize(messages: readonly Message[], roster: Roster, opts: Options = DEFAULTS): Summary {
  const hs = handoffs(messages, roster, opts)
  const runs = agentRuns(messages, roster)
  const human = messages.filter((m) => roleOf(roster, m.author) === 'human').length
  const byPair = Object.fromEntries(
    PAIRS.map((p) => {
      const of = hs.filter((h) => h.pair === p)
      const answered = of.filter((h) => h.latency !== undefined)
      return [p, { total: of.length, answered: answered.length, medianLatency: median(answered.map((h) => h.latency!)) }]
    }),
  ) as Summary['handoffs']
  const answeredAll = hs.filter((h) => h.latency !== undefined)
  const times = messages.map((m) => m.at)
  return {
    messages: { total: messages.length, human, agent: messages.length - human },
    handoffs: byPair,
    allHandoffs: { total: hs.length, answered: answeredAll.length, medianLatency: median(answeredAll.map((h) => h.latency!)) },
    span: times.length ? { from: Math.min(...times), to: Math.max(...times) } : null,
    longestAgentRun: Math.max(0, ...runs.map((r) => r.ids.length)),
    loops: loops(runs, opts).length,
    interventions: interventions(runs).length,
    options: opts,
  }
}
