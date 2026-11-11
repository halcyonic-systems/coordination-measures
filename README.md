# coordination-monitor

A Buzz plugin that shows how the people and agents in a channel coordinate: who hands off to whom, how fast they answer, where agents loop and when a human steps in.

![Two channels side by side: agents with a coordinator and agents without one](docs/compare.png)

*The browser preview, with invented channels. Not real data.*

Benchmarks for agent teams measure what a team achieves: reward, cost, throughput. This measures how the team coordinates while it works, in the channel where it works, with people in it. Put two channels side by side and the same definitions apply to both, so a difference is a difference in coordination.

Code counts; nothing reads what a message says. A separate agent, the analyst, labels what counts cannot see (`analyst/charter.md`).

## Use it in your community

1. In Buzz, open **Settings → Plugins → Manage plugins → Add**. Add from a folder with **Browse** and pick `plugin/dist`, or add from Git with this repository.
2. Review the access shown (the plugin asks for none) and choose **Install plugin**.
3. Open **Coordination** from the app's navigation and choose a channel you have joined. **Compare** sets two side by side.
4. In any channel, the **Coordination** button in the channel header measures that channel in a side panel.

It reads your joined channels through the app and updates as messages arrive. It never posts, reacts or signs.

## What it measures

| Measure | In short |
|---|---|
| Handoff | A message that mentions someone; answered when they post within 30 minutes |
| Pairing | Each handoff by role: human or agent, to human or agent |
| Reply time | From a mention to its answer, as a median |
| Agent run | Agent messages in a row with no human between |
| Loop | Two agents going back and forth for 6 or more messages |
| Human intervention | A human stepping into an agent run unasked |

Exact definitions, defaults and limits: [METRICS.md](METRICS.md).

## Layout

| Path | What | Knows Buzz? |
|---|---|---|
| `src/core/` | The measures and views, pure functions of messages and roles | No |
| `src/cli.ts` | Runs the core on a JSON file (fixtures, exported timelines) | No |
| `test/`, `fixtures/` | Known answers for every measure, worked by hand | No |
| `plugin/src/` | The page and channel panel. `read.ts` and `adapter.ts` are the only files that touch Buzz's session and event shapes | Yes |
| `plugin/dist/` | The built plugin Buzz installs: `manifest.json`, `plugin.js`, its guide and icon | |
| `plugin/preview/` | A browser preview with a stand-in host and invented channels | No |
| `analyst/charter.md` | The agent that labels failures against the MAST taxonomy | Runs in Buzz |

One computation everywhere: the tests, the command line and the plugin all call the same core, so a number on the page is a number the tests cover.

## Develop

```sh
npm install                               # dev tools only
npm test                                  # known answers
npm run typecheck
npm run measure -- fixtures/loop.json     # the summary for a file
npm run plugin:build                      # bundle to plugin/dist, then the rule check
npm run preview                           # the interface in a browser: http://127.0.0.1:4418/
```

The preview takes `?compare=1`, `?mode=dark`, `?view=panel` and `?live=1`. After a rebuild, an installed copy changes when you choose **Update** in Settings → Plugins. Commit `plugin/dist` with the source that built it.

## Rules

Buzz plugins run as unsandboxed code inside the app, and the session a plugin receives can also post, react and change channels. This plugin only reads, and `plugin/check.mjs` holds it to that on every build, deleting a build that breaks a rule:

- It asks for no host access and makes no network requests.
- It may touch three members of the session, all reads: `read`, `channels`, `subscribeIncoming`. Any other member fails the build, as does any write path by name.
- No keys, signing, native bridge, dynamic code, app storage, or driving the app's page.

## Roadmap

- **Coordination without mentions.** Agents that act on a message nobody addressed to them leave no handoff. Buzz's signed `audience` tag for agent-to-agent messages is a candidate second signal.
- **Benchmark timelines.** Run the same core over the per-trial message timelines Block's Orchestra harness keeps, to compare team shapes under assigned conditions.
- **The analyst.** An agent that labels agent failures against MAST's 14 modes, kept independent of the counts so their agreement means something.
- **Verified roles.** Check the owner attestation's signature instead of reading it as a hint.

## State (2026-11-10)

- Core: 14 tests pass. Plugin: builds and passes its check; planted writes fail it.
- Runs in Buzz (2026-11-10, a 0.7.0 preview build): the page lists joined channels, reads a live channel, shows names, recognises an agent from its profile and counts human to agent handoffs. Not yet seen on a real channel: agent to agent handoffs, a loop, compare mode with two busy channels, the channel-header panel.

## License

MIT (`LICENSE`).
