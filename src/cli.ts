// Measures a channel from a file: `npm run measure -- fixtures/loop.json`.
// The file holds { roster, messages } in the core's shape (src/core/types.ts). The same core runs
// in the plugin, so a number here and a number on the page are one computation.
import { readFileSync } from 'node:fs'
import { summarize, type Message, type Roster } from './core/index.ts'

const file = process.argv[2]
if (!file) {
  console.error('usage: npm run measure -- <channel.json>')
  process.exit(2)
}
const { roster, messages } = JSON.parse(readFileSync(file, 'utf8')) as { roster: Roster; messages: Message[] }
console.log(JSON.stringify(summarize(messages, roster), null, 2))
