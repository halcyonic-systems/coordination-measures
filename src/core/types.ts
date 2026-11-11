// The core's whole vocabulary. Nothing here knows about Buzz, Nostr or the network: an adapter
// (plugin/src/adapter.ts for live channels, src/cli.ts for files) turns its source into these.

export type Role = 'human' | 'agent'

/** One message in one channel. `at` is Unix seconds (a Nostr event's created_at). */
export type Message = {
  id: string
  author: string
  at: number
  /** Public keys the message mentions (Nostr `p` tags), the author excluded by the adapter. */
  mentions: string[]
  /** The thread root this message replies under, if any (Nostr `e` tag). */
  root?: string
}

/** Who is a human and who an agent. An author missing from the roster counts as human (METRICS.md § Roles). */
export type Roster = Record<string, Role>

/** A directed pairing by role: who addressed whom. */
export type Pair = 'human→human' | 'human→agent' | 'agent→human' | 'agent→agent'

export const PAIRS: readonly Pair[] = ['human→human', 'human→agent', 'agent→human', 'agent→agent']

export type Options = {
  /** How long a mentioned author has to answer before the handoff counts as dropped, in seconds. */
  handoffWindow: number
  /** How many consecutive agent messages, among at least two agents, make a loop. */
  loopLength: number
}

export const DEFAULTS: Options = { handoffWindow: 30 * 60, loopLength: 6 }
