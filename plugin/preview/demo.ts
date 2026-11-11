// Invented channels for the browser preview, in the shape Buzz serves them (Nostr kind 9 messages
// and kind 0 profiles). Nothing here is real data or a finding: the two team channels are written
// to look different on purpose, so the preview shows what a difference looks like.
import type { NostrEvent } from '../src/adapter.ts'

type Person = { key: string; name: string; agent?: true }
const person = (name: string, agent?: true): Person => ({ key: name.toLowerCase().replace(/[^a-z]/g, '').padEnd(64, '0'), name, ...(agent ? { agent } : {}) })

const ana = person('Ana')
const ben = person('Ben')
const coordinator = person('Coordinator', true)
const [builder, tester, writer, reviewer, planner] = ['Builder', 'Tester', 'Writer', 'Reviewer', 'Planner'].map((n) => person(n, true))

/** A small repeatable generator, so the preview looks the same on every load. */
function seeded(seed: number) {
  let s = seed
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296)
}

type Line = [from: Person, to?: Person, gap?: number]

function channel(id: string, start: number, lines: Line[], seed: number): NostrEvent[] {
  const rand = seeded(seed)
  let at = start
  return lines.map(([from, to, gap], i) => {
    at += gap ?? Math.round(20 + rand() * 70)
    return { id: `${id}-${String(i).padStart(3, '0')}`, pubkey: from.key, created_at: at, kind: 9, content: '', tags: [['h', id], ...(to ? [['p', to.key]] : [])] }
  })
}

const START = 1794332400 // an arbitrary morning

// A coordinator hands work out and collects it; people ask and are answered.
const coordinated: Line[] = [
  [ana, coordinator], [coordinator, planner], [planner, coordinator], [coordinator, builder], [coordinator, tester],
  [builder, coordinator], [coordinator, ana, 40], [ana, coordinator], [coordinator, writer], [tester, coordinator],
  [writer, coordinator], [coordinator, ben], [ben, coordinator, 240], [coordinator, builder], [builder, coordinator],
  [coordinator, tester], [tester, coordinator], [coordinator, reviewer], [reviewer, coordinator], [coordinator, ana],
  [ana, ben, 300], [ben, ana, 180], [ana, coordinator], [coordinator, writer], [writer, coordinator],
  [coordinator, ana], [ana], [ben, coordinator], [coordinator, ben], [ben],
]

// No coordinator: agents pass work among themselves, loop, and drop handoffs until someone steps in.
const flat: Line[] = [
  [ana, builder], [builder, tester], [tester, builder], [builder, tester], [tester, builder], [builder, tester],
  [tester, builder], [builder, tester], [ana, undefined, 500], [builder, writer], [writer, reviewer], [reviewer, planner],
  [planner, builder], [builder, tester], [tester, writer], [writer, builder], [builder, reviewer], [reviewer, writer],
  [writer, reviewer], [reviewer, writer], [writer, reviewer], [reviewer, writer], [writer, reviewer], [ben, undefined, 700], [ben, reviewer], [reviewer, ben],
  [ben, planner], [tester, planner], [builder, planner], [writer, planner], [ana, tester, 900], [tester, ana],
  [tester, builder], [builder, tester], [tester, writer], [ana],
]

const study: Line[] = [[ana], [ana, ben], [ben, ana, 95], [ana, coordinator], [coordinator, ana, 12], [coordinator, builder], [builder, coordinator, 30], [ben]]

export const CHANNELS = [
  { id: 'demo-coordinated', name: 'agents-with-coordinator', channelType: 'stream' },
  { id: 'demo-flat', name: 'agents-without-coordinator', channelType: 'stream' },
  { id: 'demo-study', name: 'coordination-study', channelType: 'stream' },
  { id: 'demo-empty', name: 'new-channel', channelType: 'stream' },
] as const

export const MESSAGES: Record<string, NostrEvent[]> = {
  'demo-coordinated': channel('demo-coordinated', START, coordinated, 7),
  'demo-flat': channel('demo-flat', START, flat, 11),
  'demo-study': channel('demo-study', START + 3600, study, 3),
  'demo-empty': [],
}

export const PROFILES: NostrEvent[] = [ana, ben, coordinator, builder, tester, writer, reviewer, planner].map((p) => ({
  id: `profile-${p.name}`, pubkey: p.key, created_at: START - 1000, kind: 0, content: JSON.stringify({ name: p.name }),
  // Agents carry an owner attestation tag on their profile; here it is a placeholder, never checked.
  tags: p.agent ? [['auth', ana.key, '', 'demo']] : [],
}))

/** One more invented message for the first channel, for the preview's live mode. */
export function another(n: number): NostrEvent {
  const pairs: [Person, Person][] = [[coordinator, tester], [tester, coordinator], [coordinator, ana], [ana, coordinator]]
  const [from, to] = pairs[n % pairs.length]
  const last = MESSAGES['demo-coordinated'][MESSAGES['demo-coordinated'].length - 1]
  return { id: `demo-coordinated-live-${n}`, pubkey: from.key, created_at: last.created_at + 25, kind: 9, content: '', tags: [['h', 'demo-coordinated'], ['p', to.key]] }
}
