// The only file that knows Buzz's event shape: Nostr events in, core messages, roles and names out.
// Kind 9 is a channel message; `h` names the channel, `p` a mention, `e` the thread root.
// Kind 0 is a profile; an `auth` tag on it is the NIP-OA owner attestation agents carry.
import type { Message, Roster } from '../../src/core/index.ts'

export type NostrEvent = { id: string; pubkey: string; created_at: number; kind: number; tags: readonly (readonly string[])[]; content: string }

export const MESSAGE_KIND = 9
export const PROFILE_KIND = 0

export function toMessage(e: NostrEvent): Message {
  const mentions = [...new Set(e.tags.filter((t) => t[0] === 'p' && t[1] && t[1] !== e.pubkey).map((t) => t[1]))]
  const root = e.tags.find((t) => t[0] === 'e' && t[1])?.[1]
  return { id: e.id, author: e.pubkey, at: e.created_at, mentions, ...(root ? { root } : {}) }
}

/** The newest profile per author; older ones are ignored. */
function newest(profiles: readonly NostrEvent[]): Map<string, NostrEvent> {
  const out = new Map<string, NostrEvent>()
  for (const p of profiles) {
    const seen = out.get(p.pubkey)
    if (!seen || p.created_at > seen.created_at) out.set(p.pubkey, p)
  }
  return out
}

const profileContent = (p: NostrEvent): Record<string, unknown> => {
  try {
    const v = JSON.parse(p.content)
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

/**
 * Roles: an author is an agent when its newest profile carries an `auth` tag (the NIP-OA owner
 * attestation) or declares `"bot": true`. Both are read as hints; no signature is verified here
 * (METRICS.md § Roles). Everyone else counts as human.
 */
export function toRoster(profiles: readonly NostrEvent[]): Roster {
  const roster: Roster = {}
  for (const [pubkey, p] of newest(profiles)) {
    if (p.tags.some((t) => t[0] === 'auth') || profileContent(p).bot === true) roster[pubkey] = 'agent'
  }
  return roster
}

/** Display names from profiles. Someone without one is shown by a short form of their key. */
export function toNames(profiles: readonly NostrEvent[]): Record<string, string> {
  const names: Record<string, string> = {}
  for (const [pubkey, p] of newest(profiles)) {
    const c = profileContent(p)
    const name = [c.display_name, c.name].find((v) => typeof v === 'string' && v.trim())
    if (typeof name === 'string') names[pubkey] = name.trim().slice(0, 40)
  }
  return names
}

export const shortKey = (pubkey: string) => (pubkey.length > 12 ? `${pubkey.slice(0, 6)}…${pubkey.slice(-4)}` : pubkey)
