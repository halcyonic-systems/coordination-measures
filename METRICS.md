# Metrics

The instrument's definitions. Each is a pure function in `src/core/` with known answers in `test/`; change one, change all three in the same commit. Version 0 (2026-11-10): process measures over one channel, in time order.

## Inputs

| Term | Definition |
|---|---|
| Message | One channel message (Nostr kind 9 tagged `h` with the channel id): id, author, time in Unix seconds, mentions, thread root |
| Mention | A `p` tag naming someone other than the author |
| Order | Messages sorted by time, ties by id. Every measure reads this one sequence |
| Window | The plugin reads a channel's latest 500 messages, the most Buzz returns in one read, and says so when a channel has more |

## Roles

Each author is a **human** or an **agent**. An author is an agent when its newest profile (kind 0) carries an `auth` tag, the NIP-OA owner attestation Buzz agents carry, or declares `"bot": true`. Everyone else counts as human.

Known limits: both are read as hints, no signature is checked; a script identity with neither (a bot run from a plain key) counts as human.

## Measures

| Measure | Definition | Default |
|---|---|---|
| **Pairing** | The roles of a mention's author and target, directed: human→human, human→agent, agent→human, agent→agent | |
| **Handoff** | A message that mentions someone. **Answered** when the mentioned author posts a later message within the window; otherwise **dropped** | Window 30 min |
| **Reply time** | For an answered handoff, the time from the mention to the first answer. Reported as the median, overall and per pairing | |
| **Agent run** | A maximal stretch of consecutive agent messages with no human message between | |
| **Loop** | Inside an agent run, two agents alternating, one message each in turn, for at least the loop length, with no third agent between | Length 6 |
| **Human intervention** | A human message that ends an agent run of two or more messages, when no message in that run mentioned that human | |

Two of these were tightened on 2026-11-10, after a first version over-counted on test channels:

- A loop was "any agent run of the loop length among two or more agents". That flagged a coordinator handing work to three workers, which is ordinary teamwork. A loop is now the back-and-forth itself.
- An intervention was "any human message ending an agent run". That counted a human answering an agent's mention, which is an answered agent→human handoff and is counted there. An intervention is now a human stepping in unasked.

## Views

What the dashboard draws. Each regroups the measures above and adds none (`src/core/views.ts`).

| View | Definition |
|---|---|
| **Participants** | Per person: messages, handoffs sent, handoffs received, and how many of those received they answered |
| **Edges** | Per ordered pair of people: handoffs from the first to the second, and how many were answered. The handoff network draws these |
| **Timeline** | Per message, in order: its author and role, whether it is part of a loop, whether it is an intervention, and how many of its mentions were dropped |

## What version 0 does not do

- **Coordination without mentions.** A handoff here is a mention. Agents that act on a message nobody addressed to them leave no handoff, so that coordination is invisible. Buzz marks agent-to-agent coordination messages with a signed `audience` tag, a possible second signal.
- **Longer cycles.** Three or more agents passing work in rotation are an agent run, not a loop.
- **Threads.** Order is channel-wide; a reply in a thread and a message in the channel interleave by time.
- **Content.** Nothing reads what a message says. Labelling failures by meaning is the analyst agent's job (`analyst/charter.md`), kept apart so the counts stay exact.
- **Outcomes.** Whether the work succeeded is out of scope; Block's own Buzz benchmarks measure that (the Orchestra harness in `block/buzz`, `benchmarks/harbor-buzz-orchestra`).
- **Thresholds.** 30 minutes and 6 messages are starting values, not findings.
