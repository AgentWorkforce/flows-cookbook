# pr-reviewer

A robot reads your pull request and writes a review. It's only allowed to fix boring things (typos, formatting) — a *different* part of the machine runs your tests, and the robot doesn't get to say whether they passed. Green tests push the boring fixes; red tests get the fixes discarded and the review says so. The review only says "ready for a human" when the agent said so **and** the tests were green **and** GitHub agrees.

```
PR state (REST) → checkout PR head → f.agent("review") [gated on review.md existing]
  → tests OUTSIDE the agent → green: commit + push mechanical fixes | red: discard + advisory
  → f.github.comment → done
```

An approval from an allowlisted approver takes a short path straight to merge.

## Run it locally

From a checkout of the repository the PR belongs to:

```bash
export GH_TOKEN=$(gh auth token)
flows check pr-reviewer.flow.ts
flows run pr-reviewer.flow.ts --local-agent \
  --input '{"owner":"o","repo":"r","number":7,"approvers":"you","githubTransport":"curl"}'
```

`flows.json` needs `{ "executors": ["github"] }` alongside your `cli`/`models` — the flow declares GitHub webhook triggers even when you're launching it directly.

**A real checkout gotcha:** this flow's own git hygiene (`git clean -fdq -e .workforce` when there's nothing to push) will delete anything untracked in the checkout that isn't `.workforce/` — including a locally-installed `node_modules/`, `flows.json`, or the flow file itself if you put them inside the repo you're reviewing. Point `--data-dir` outside the checkout so the daemon's own journal survives that cleanup:

```bash
flows run pr-reviewer.flow.ts --local-agent --data-dir /somewhere/else \
  --input '{...}'
```

## Run it on Cloud

```bash
flows run --cloud --sync-code --wait pr-reviewer.flow.ts --input '{"owner":"o","repo":"r","number":7,"approvers":"you"}'
```

Cloud trigger wiring (`flows deploy … --on github:pull_request`) isn't live yet — PR events are filtered out before launch today. Run this one on a schedule of your own, or by hand, until that lands.

## Verified

Run for real against an isolated sandbox repo (2026-09-17): [cloud-e2e-sandbox#28](https://github.com/AgentWorkforce/cloud-e2e-sandbox/pull/28) — a real Claude review agent read a probe PR, found a deliberately-planted typo, fixed it mechanically, pushed the fix, and posted a genuine review comment explaining what it changed and why it left the surrounding prose alone. `completionReason: success`, 15 journaled steps.

`tests/pr-state.test.ts` carries the ported upstream test suite plus the v2-seam tests (44 assertions total) for the pure decision functions — run with `npm test`.
