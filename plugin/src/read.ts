// Everything the plugin asks of Buzz, in one place, and all of it reading.
//
// The relay session Buzz hands a plugin also carries write paths (posting, reacting, channel and
// member changes). This file names the few read members the plugin uses and nothing else touches
// the session; plugin/check.mjs fails any build that mentions a write path. Shapes follow buzz-app
// `src/features/relay/session.ts` and `contracts.ts` (read 2026-11-10); `read` and the snapshot
// were also seen live that day.
import { MESSAGE_KIND, PROFILE_KIND, toMessage, toNames, toRoster, type NostrEvent } from './adapter.ts'
import type { Message, Roster } from '../../src/core/index.ts'

export type Channel = { id: string; name: string; channelType?: string; hidden?: boolean; visibility?: string }

/** The read members of Buzz's relay session that this plugin uses. */
export type Session = {
  read: (filters: readonly object[], opts?: { signal?: AbortSignal }) => Promise<readonly NostrEvent[]>
  channels: { list: () => { channels: readonly Channel[] }; subscribeList?: (listener: () => void) => () => void }
  subscribeIncoming?: (listener: (messages: readonly { channelId: string }[]) => void) => () => void
}
export type Relay = {
  snapshot: () => { status: string; session?: Session; scope?: string; generation?: number }
  subscribe: (listener: () => void) => () => void
}

/** The relay refuses a filter without a limit from 1 to 500 (seen live 2026-11-10). */
export const MESSAGE_LIMIT = 500

export type ChannelData = { messages: Message[]; roster: Roster; names: Record<string, string>; capped: boolean }

/** One channel's most recent messages (up to the limit), with its people's roles and names. */
export async function readChannel(session: Session, channelId: string, signal?: AbortSignal): Promise<ChannelData> {
  const events = (await session.read([{ kinds: [MESSAGE_KIND], '#h': [channelId], limit: MESSAGE_LIMIT }], { signal })).filter((e) => e.kind === MESSAGE_KIND)
  const messages = events.map(toMessage)
  const people = [...new Set(messages.flatMap((m) => [m.author, ...m.mentions]))].slice(0, MESSAGE_LIMIT)
  const profiles = people.length ? await session.read([{ kinds: [PROFILE_KIND], authors: people, limit: Math.min(MESSAGE_LIMIT, people.length * 2) }], { signal }) : []
  return { messages, roster: toRoster(profiles), names: toNames(profiles), capped: events.length >= MESSAGE_LIMIT }
}

/** The channels worth measuring: ordinary joined channels, not direct messages, Solo chats or system channels. */
export const measurable = (channels: readonly Channel[]): Channel[] =>
  channels.filter((c) => !c.hidden && (c.channelType === undefined || c.channelType === 'stream' || c.channelType === 'forum')).sort((a, b) => a.name.localeCompare(b.name))
