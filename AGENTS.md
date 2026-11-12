# AGENTS.md

For anyone changing this repository, person or agent. What the plugin is and how to use it: `README.md`. What each measure means: `METRICS.md`.

The repository is a small core of measures (pure functions over messages and roles) and a Buzz plugin that shows them. The tests, the command line and the plugin all call the same core, so a number on the page is a number the tests cover.

## Before you commit

```sh
npm install                               # dev tools only
npm test                                  # known answers
npm run typecheck
npm run plugin:build                      # bundle to plugin/dist, then the rule check
npm run preview                           # the interface in a browser: http://127.0.0.1:4418/
```

All of the first four must pass. Look at the preview after any change to what is drawn.

## Rules

- **The plugin only reads.** `plugin/check.mjs` runs on every build and deletes a build that breaks a rule. If it fails, change the code, never the check. The one write is the clipboard, on the Copy as HTML button.
- **Buzz stays in two files.** Only `plugin/src/read.ts` touches the app's session, and only `plugin/src/adapter.ts` knows its event shapes. The core never imports from `plugin/`.
- **A measure starts in `METRICS.md`.** Write the definition, then a known answer worked by hand in `fixtures/` and `test/`, then the code. Components format numbers; they do not compute them.
- **Views add no measures.** `src/core/views.ts` only regroups what `metrics.ts` defines.
- **Commit `plugin/dist` with the source that built it.** Buzz installs from that folder.
- **Follow Buzz's plugin guide** ([authoring guide](https://github.com/block/buzz-app/blob/main/docs/plugin-authoring-guide.md), [architecture](https://github.com/block/buzz-app/blob/main/docs/plugin-architecture.md)): React comes from the host through `plugin/src/host.ts`, never an import; nothing runs when the module loads; styles are inline and use the app's tokens; a panel renders only its body, because the app draws the card around it.
- **No real channels in the repository.** The preview and its screenshots use invented channels and say so. A still of a real channel goes in `captures/`, which git ignores; the one in `docs/channel.png` has names hidden.
- **Keep the README's State section true.** It lists what has been seen working in Buzz and what has not. Update it when that changes, and call nothing a finding.
- **Plain words** in the interface and the docs; define a term where it first appears.

## Layout

| Path | What | Knows Buzz? |
|---|---|---|
| `src/core/` | The measures and views, pure functions of messages and roles | No |
| `src/cli.ts` | Runs the core on a JSON file: `npm run measure -- fixtures/loop.json` | No |
| `test/`, `fixtures/` | Known answers for every measure, worked by hand | No |
| `plugin/src/` | The page and the channel panel | Yes |
| `plugin/README.md` | The guide Buzz shows people who install the plugin | |
| `plugin/dist/` | The built plugin Buzz installs: `manifest.json`, `plugin.js`, the guide and icon | |
| `plugin/preview/` | A browser preview with a stand-in host and invented channels | No |
| `tools/capture.mjs` | Saves a still copied from the plugin, and one image of it | No |
| `analyst/charter.md` | Instructions for a planned agent that labels failures; not built | Runs in Buzz |

## Seeing your change

- **In a browser.** `npm run preview` takes `?compare=1`, `?mode=dark`, `?view=panel` (the channel panel), `?live=1` (a new invented message every few seconds), `?anon=1` (names hidden), `?channel=demo-flat` (also `demo-study`, `demo-quiet`, `demo-empty`) and `?still=1` (the page replaced by its own still).
- **In Buzz.** After a rebuild, an installed copy changes when its owner chooses **Update** in Settings → Plugins. The preview's styles are a stand-in for the app's, so check there too.
- **From a still.** In Buzz, **Copy as HTML** puts the whole page on the clipboard as one HTML file with the app's styles written onto each element. `npm run capture` saves it and one image at full height to `captures/` (macOS and Chrome). Read the file to see what the person saw.
