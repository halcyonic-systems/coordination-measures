// Known answers for the views, from the same hand-worked fixtures as the measures.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { edges, participants, summarize, timeline, type Message, type Roster } from '../src/core/index.ts'

const load = (name: string) =>
  JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8')) as { roster: Roster; messages: Message[] }

test('participants: messages, handoffs sent, received and answered', () => {
  const { roster, messages } = load('loop')
  const ps = participants(messages, roster)
  assert.deepEqual(ps.map((p) => [p.id, p.role, p.messages, p.sent, p.received, p.answered]), [
    ['referee', 'agent', 3, 3, 3, 3],
    ['scout', 'agent', 3, 3, 4, 3],
    ['shingai', 'human', 2, 1, 0, 0],
  ])
})

test('edges: who addressed whom, weighted', () => {
  const { roster, messages } = load('loop')
  const es = edges(messages, roster).map((e) => [e.from, e.to, e.handoffs, e.answered])
  assert.deepEqual(es, [
    ['shingai', 'scout', 1, 1],
    ['scout', 'referee', 3, 3],
    ['referee', 'scout', 3, 2],
  ])
})

test('timeline: loop beats, the intervention, the dropped handoff', () => {
  const { roster, messages } = load('loop')
  const t = timeline(messages, roster)
  assert.deepEqual(t.filter((b) => b.inLoop).map((b) => b.id), ['m2', 'm3', 'm4', 'm5', 'm6', 'm7'])
  assert.deepEqual(t.filter((b) => b.intervention).map((b) => b.id), ['m8'])
  assert.deepEqual(t.filter((b) => b.dropped).map((b) => b.id), ['m7'])
})

test('views agree with the summary', () => {
  const { roster, messages } = load('handoff')
  const s = summarize(messages, roster)
  const sent = participants(messages, roster).reduce((n, p) => n + p.sent, 0)
  const total = Object.values(s.handoffs).reduce((n, h) => n + h.total, 0)
  assert.equal(sent, total)
  assert.equal(edges(messages, roster).reduce((n, e) => n + e.handoffs, 0), total)
})
