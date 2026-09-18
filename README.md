# flows-cookbook

**We cook. Everybody eats.**

Stop babysitting agents. Script them. Every recipe here is a single `.flow.ts` (or `.flow.yaml`) file — copy it, point it at your repo, run it locally or deploy it to [Agent Relay Cloud](https://agentrelay.com/cloud) where it listens for tickets, PRs, or a schedule and every run is observable and replayable.

Built on [relay(Flows)](https://github.com/AgentWorkforce/flows). Install:

```bash
npm install -g relayflows
npm install --save-dev @relayflows/surface
```

## Getting started

- **[cloud-gates](cloud-gates/)** — the smallest possible flow: one step, one gate, proves your setup works before you build on top of it.
- **[prospect-demo](prospect-demo/)** — generate a message with an LLM, post it to Slack. The smallest flow that touches the outside world.

## Automations

- **[stale-issues](stale-issues/)** — on a schedule, triage every open issue in a repo (stale vs. needs-attention, not just "quiet for N days") and post a Slack digest.

  ```bash
  flows schedule stale-issues/stale-issues.flow.ts \
    --cron "0 9 * * 1-5" --tz Europe/Oslo \
    --input '{"repo":"acme/api","channel":"#eng","staleDays":14}'
  ```

- **[stale-prs](stale-prs/)** — same shape, for pull requests: ready-to-merge, needs-review, needs-author, or abandoned — because staleness is about whose turn it is, not just how long it's been quiet.

  ```bash
  flows schedule stale-prs/stale-prs.flow.ts \
    --cron "0 9 * * 1-5" --tz Europe/Oslo \
    --input '{"repo":"acme/api","channel":"#eng","staleDays":14}'
  ```

## Review

- **[pr-reviewer](pr-reviewer/)** — reads a PR, fixes what's mechanical, and only says "ready for a human" when the agent, the tests, and GitHub all agree. The test result is never the agent's own word for it.

## Software Factory

- **[software-factory](software-factory/)** — an issue becomes a PR: implementation agent → deterministic tests (outside the agent) → adversarial review agent that has to write an explicit verdict → PR for a human.

  ```bash
  flows deploy software-factory/software-factory.flow.ts \
    --repo acme/api --on linear:team=ENG --approver you
  ```

  [![Deploy Flow](https://agentrelay.com/launch-agent_small.svg)](https://agentrelay.com/cloud/flows/deploy?flow=https%3A%2F%2Fgithub.com%2FAgentWorkforce%2Fflows-cookbook%2Fblob%2Fmain%2Fsoftware-factory%2Fsoftware-factory.flow.ts&on=linear%3Ateam%3DENG)

`--on` takes `github`, `linear`, `jira`, `shortcut` or `slack` with optional filters (`github:labels=agent`, `jira:project=OPS`, `slack:channel=#eng`). `flows deployments` lists what's listening; `flows undeploy <id>` stops it. Sign in once with `agent-relay cloud login`.

## Verified, not assumed

Every recipe above was run for real before it was published here — not just typechecked. See each recipe's README for the run link, the exact command, and what was (and wasn't) exercised. Where a recipe hit a real, current bug in the flows kernel or CLI, it's linked below instead of quietly worked around.

## Coming soon

These four use-cases are real, but currently blocked on upstream work in [flows](https://github.com/AgentWorkforce/flows) — included here so they aren't silently dropped:

| Recipe | What it does | Blocked on |
| --- | --- | --- |
| dependency-upgrade-bot | Upgrade a dependency in one sandbox, verify it end-to-end in a second, independent sandbox before opening a PR | [flows#458](https://github.com/AgentWorkforce/flows/issues/458) — needs kernel-enforced workspace isolation between the two agent sandboxes |
| pr-review-pipeline | Three review agents (security/correctness/performance) fan out over a diff, a fourth reconciles disagreement | [flows#449](https://github.com/AgentWorkforce/flows/pull/449) (open) — fixes the predicate-gate bug currently blocking it |
| social-post-pipeline | Research → draft → adversarial fact-check → graphic → human approval, for a social post | [flows#400](https://github.com/AgentWorkforce/flows/issues/400) — `f.human` isn't wired to an execution path yet |
| research | Fan a research question out to three model lanes, synthesize one report | Bespoke shim runner, not yet on the flows v2 kernel; needs an authenticated Grok CLI |

## A note on staleness

Half the recipes here are, themselves, staleness sweepers. Every README above carries the date it was last actually run, on purpose — a cookbook that describes what used to work is exactly the failure mode this repo exists to catch elsewhere.
