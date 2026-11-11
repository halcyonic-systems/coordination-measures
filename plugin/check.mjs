// The plugin rules, enforced on the built artifact (README § Rules). Plugins run as unsandboxed code
// inside Buzz. This one may read channel events through the relay session and nothing else: no host
// grants, no network, no writes. The relay session also carries many write paths (posting, reacting,
// channel and member changes), so the check allows only the session's read members by name and
// fails on any write path (rule set 2026-11-10). Exit 1 names every broken rule.
import { readFileSync } from 'node:fs'

const dir = process.argv[2] ?? new URL('./dist/', import.meta.url).pathname
const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8'))
const code = readFileSync(`${dir}/plugin.js`, 'utf8')
const broken = []
const fail = (rule) => broken.push(rule)

// Buzz refuses the folder when the description is empty or over 280 bytes (seen 2026-11-05).
const descBytes = Buffer.byteLength(manifest.description ?? '', 'utf8')
if (descBytes < 1 || descBytes > 280) fail(`manifest.description is ${descBytes} bytes; Buzz requires 1 to 280`)

// No host grants at all: everything comes through the relay session.
if (manifest.host && Object.keys(manifest.host).length) fail(`manifest.host declares ${Object.keys(manifest.host).join(', ')}; none is allowed`)

const ALLOWED_INJECT = ['react', 'pages', 'panels', 'relay']
const inject = /export\s*(?:const|let|var)\s+inject\s*=\s*\[([^\]]*)\]/.exec(code) ?? /\binject\s*=\s*\[([^\]]*)\]/.exec(code)
if (!inject) fail('no inject list found in plugin.js')
else
  for (const name of inject[1].match(/["'`]([^"'`]+)["'`]/g)?.map((q) => q.slice(1, -1)) ?? []) {
    if (!ALLOWED_INJECT.includes(name)) fail(`inject "${name}" is not allowed`)
  }

// The only members of the relay session this plugin may touch (plugin/src/read.ts names them).
const SESSION_READS = ['read', 'channels', 'subscribeIncoming']
for (const m of code.matchAll(/\bsession\??\.([A-Za-z_$][\w$]*)/g)) {
  if (!SESSION_READS.includes(m[1])) fail(`plugin.js uses session.${m[1]}; only ${SESSION_READS.join(', ')} are allowed`)
}

const FORBIDDEN = [
  // The write side of the relay session, by name (buzz-app src/features/relay/session.ts, 2026-11-10).
  [/\.(outbox|channelWrites|channelCreation|channelLifecycle|channelDetails|channelKit|directMessages|memberAdministration|memberAdditions|publishAgentPresence|configArtifactWriter|authorizeAgentLog|authorizeGit|feedbackUpload|agentMemories|sidebarPreferences|soloPreferences|readRemote|snapshotRead)\b/, 'a write or privileged path of the relay session'],
  [/\.messages\.(send|reply|react|edit|delete)\b|\bpublish\s*\(|\.(send|reply|react|sign)\s*\(/, 'posting, replying, reacting or signing as the user'],
  [/\brunCommand\b|\bspawn\s*\(|\brequestOnce\b|\bupload\s*\(|\bsaveBytes\b|\.request\s*\(|\breadFile\b|\bserveMcp\b/, 'host commands, processes, requests or files'],
  [/\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket|EventSource|sendBeacon/, 'direct network'],
  [/nsec1|privateKey|private_key|mnemonic|find-generic-password|Keychain/i, 'anything key-shaped'],
  [/\beval\s*\(|new\s+Function\s*\(|import\s*\(/, 'dynamic code'],
  [/__TAURI__|\binvoke\s*\(|identity_export|prepareRemoteAgentAuthorization|relay_sign/, "the app's native bridge or host signing"],
  [/execCommand|new\s+KeyboardEvent|new\s+InputEvent|\.dispatchEvent\s*\(/, "driving the app's own page"],
  [/<iframe|<script|\.src\s*=|new\s+Image\s*\(|document\.cookie|indexedDB|localStorage|sessionStorage/, 'loading outside content, or reading app storage'],
]
for (const [pattern, what] of FORBIDDEN) {
  const m = pattern.exec(code)
  if (m) fail(`plugin.js contains ${what} ("${m[0]}")`)
}

if (broken.length) {
  console.error(`plugin check failed (${dir}):\n- ${[...new Set(broken)].join('\n- ')}`)
  process.exit(1)
}
console.log(`plugin check passed: ${manifest.id}, ${code.length} bytes, inject ${inject[1].trim()}, no host grants, session reads only`)
