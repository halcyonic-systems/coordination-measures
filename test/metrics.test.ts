// Known answers for each measure, worked by hand from the fixtures. A change to a definition in
// METRICS.md changes a test here first.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { agentRuns, handoffs, interventions, loops, summarize, type Message, type Roster } from '../src/core/index.ts'

const load = (name: string) =>
  JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8')) as { roster: Roster; messages: Message[] }

test('loop: six alternating agent messages, ended by a human', () => {
  const { roster, messages } = load('loop')
  const runs = agentRuns(messages, roster)
  assert.equal(runs.length, 1)
  assert.deepEqual(runs[0], { ids: ['m2', 'm3', 'm4', 'm5', 'm6', 'm7'], authors: ['scout', 'referee', 'scout', 'referee', 'scout', 'referee'], agents: 2, endedBy: 'm8' })
  assert.deepEqual(loops(runs), [{ ids: ['m2', 'm3', 'm4', 'm5', 'm6', 'm7'], agents: ['scout', 'referee'] }])
  assert.equal(loops(runs).length, 1)
  assert.equal(interventions(runs).length, 1)
  // The last agent message (m7) mentions scout, who never answers: one dropped handoff.
  const s = summarize(messages, roster)
  assert.deepEqual(s.handoffs['agent→agent'], { total: 6, answered: 5, medianLatency: 30 })
  assert.deepEqual(s.handoffs['human→agent'], { total: 1, answered: 1, medianLatency: 30 })
  assert.equal(s.longestAgentRun, 6)
  assert.deepEqual(s.allHandoffs, { total: 7, answered: 6, medianLatency: 30 })
  assert.deepEqual(s.span, { from: 0, to: 600 })
})

test('loop threshold: five messages are not a loop', () => {
  const { roster, messages } = load('loop')
  assert.equal(loops(agentRuns(messages.filter((m) => m.id !== 'm7'), roster)).length, 0)
})

test('handoffs: each pairing, with latency, and one dropped', () => {
  const { roster, messages } = load('handoff')
  const hs = handoffs(messages, roster)
  assert.deepEqual(
    hs.map((h) => [h.id, h.pair, h.latency ?? null]),
    [
      ['h1', 'human→human', 120],
      ['h2', 'human→agent', 30],
      ['h3', 'agent→human', 300],
      ['h4', 'human→agent', null],
    ],
  )
  const s = summarize(messages, roster)
  assert.deepEqual(s.messages, { total: 5, human: 4, agent: 1 })
  assert.equal(s.loops, 0)
  assert.equal(s.interventions, 0) // a run of one agent message is not an intervention
})

test('window: an answer after the window is a dropped handoff', () => {
  const { roster, messages } = load('handoff')
  const h = handoffs(messages, roster, { handoffWindow: 60, loopLength: 6 })
  assert.equal(h.find((x) => x.id === 'h1')!.latency, undefined)
})

test('unknown authors count as human', () => {
  const s = summarize([{ id: 'x', author: 'stranger', at: 0, mentions: [] }], {})
  assert.equal(s.messages.human, 1)
})

test('empty channel: zeros and no span', () => {
  const s = summarize([], {})
  assert.equal(s.span, null)
  assert.deepEqual(s.allHandoffs, { total: 0, answered: 0, medianLatency: null })
  assert.equal(s.longestAgentRun, 0)
})

// Six agent messages in a row is not a loop unless two agents are going back and forth.
const say = (id: string, author: string, at: number, mentions: string[] = []): Message => ({ id, author, at, mentions })
const team: Roster = { lead: 'agent', a: 'agent', b: 'agent', c: 'agent', ana: 'human' }

test('a coordinator handing out work is an agent run, not a loop', () => {
  const messages = [say('1', 'lead', 1), say('2', 'a', 2), say('3', 'lead', 3), say('4', 'b', 4), say('5', 'lead', 5), say('6', 'c', 6), say('7', 'lead', 7)]
  const runs = agentRuns(messages, team)
  assert.equal(runs[0].ids.length, 7)
  assert.equal(loops(runs).length, 0)
  assert.equal(summarize(messages, team).longestAgentRun, 7)
})

test('a loop inside a longer run: only the back-and-forth stretch counts', () => {
  const messages = [say('1', 'lead', 1), say('2', 'c', 2), say('3', 'a', 3), say('4', 'b', 4), say('5', 'a', 5), say('6', 'b', 6), say('7', 'a', 7), say('8', 'b', 8), say('9', 'lead', 9)]
  assert.deepEqual(loops(agentRuns(messages, team)), [{ ids: ['3', '4', '5', '6', '7', '8'], agents: ['a', 'b'] }])
})

test('the same agent twice in a row breaks a loop', () => {
  const messages = [say('1', 'a', 1), say('2', 'b', 2), say('3', 'a', 3), say('4', 'a', 4), say('5', 'b', 5), say('6', 'a', 6), say('7', 'b', 7)]
  assert.equal(loops(agentRuns(messages, team)).length, 0)
})

test('a human who was asked answers; a human who was not steps in', () => {
  const asked = [say('1', 'lead', 1), say('2', 'a', 2, ['ana']), say('3', 'ana', 3)]
  assert.equal(interventions(agentRuns(asked, team)).length, 0)
  const unasked = [say('1', 'lead', 1), say('2', 'a', 2, ['lead']), say('3', 'ana', 3)]
  assert.equal(interventions(agentRuns(unasked, team)).length, 1)
})
