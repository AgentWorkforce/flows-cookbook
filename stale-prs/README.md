# stale-prs

The PR analog of [`stale-issues`](../stale-issues/): on a schedule, look at every open pull request in a repository and post a Slack digest sorted by whose turn it is — not how long it's been quiet. A PR waiting on a reviewer and an abandoned branch can both go silent for two weeks; one needs a nudge, the other needs closing.

```bash
flows schedule stale-prs.flow.ts \
  --cron "0 9 * * 1-5" --tz Europe/Oslo \
  --input '{"repo":"acme/api","channel":"#eng","staleDays":14}'
```

Every PR lands in exactly one bucket — **ready to merge** (approved, checks green), **needs review**, **needs author** (changes requested, CI red, merge conflict), or **abandoned** (no clear owner or realistic next step — a candidate to close). The fetch step pulls `mergeable_state`, labels, and age for every open, non-draft PR deterministically (journaled, paginated in full); only the classification is delegated to an LLM, schema-validated the same way `stale-issues` is.

This intentionally does not attempt [`internal-agents/pr-shepherd`](https://github.com/AgentWorkforce/internal-agents)'s full sophistication — a seven-state taxonomy, an escalation ladder with idempotent pings, and merge→deploy tracing, built and refined against real production PRs over time. That system is real but its own README discloses several pieces as unproven (timeline-based staleness not wired into the live sweep, VFS comment/deployment paths unverified against a live mount). `stale-prs` borrows the one idea worth carrying into a first cut — staleness is about whose turn it is — without inheriting untested complexity.

## Verified

Run for real against [AgentWorkforce/cloud](https://github.com/AgentWorkforce/cloud) (2026-09-17, `flows run --local-agent`): fetched all 94 open, non-draft PRs with live `mergeable_state` per PR, classified 4 ready to merge, 49 needing review, 4 needing author action, and 0 abandoned by this run's (more conservative) bar for "no realistic next step." `completionReason: success`.

Slack delivery verified via the documented `RELAYFLOWS_SLACK_MOCK=1` local receipt, same as `stale-issues`.
