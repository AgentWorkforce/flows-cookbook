# software-factory

A ticket becomes a pull request. An implementation agent writes the code, a deterministic test run checks it — outside the agent, so it can't be talked into green — then a second, adversarial agent reviews the diff and has to write an explicit pass/block verdict before a PR opens for a human.

```bash
flows deploy software-factory.flow.ts \
  --repo acme/api --on linear:team=ENG --approver you
```

[![Deploy Flow](https://agentrelay.com/deploy-flow_small.svg)](https://agentrelay.com/cloud/flows/deploy?flow=https%3A%2F%2Fgithub.com%2FAgentWorkforce%2Fflows-cookbook%2Fblob%2Fmain%2Fsoftware-factory%2Fsoftware-factory.flow.ts&on=linear%3Ateam%3DENG)

`--on` also takes `github:labels=agent`, `jira:project=OPS`, `shortcut:workspace=…` or `slack:channel=#eng`. Each matching ticket launches one Cloud run in a fresh `relayflow/software-factory-<id>` branch of `--repo`; a passing review opens a PR, a blocked one opens a draft PR carrying the findings and ends `step_failed` instead of pretending nothing went wrong.

Locally, from a checkout on a scratch branch:

```bash
GH_TOKEN=$(gh auth token) flows run software-factory.flow.ts --local-agent \
  --input '{"approver":"you","issue":{"source":"local","title":"Add a health endpoint","body":"GET /healthz returns 200","labels":[]}}'
```

## Verified

Run for real against an isolated sandbox repo (2026-09-17), `flows run --local-agent`, real Claude agent steps, real GitHub push and PR: [cloud-e2e-sandbox#29](https://github.com/AgentWorkforce/cloud-e2e-sandbox/pull/29) — implementer wrote the change, deterministic tests ran outside the agent, adversarial review caught an incomplete test wiring on the first attempt (correctly failed the run rather than opening a PR) and passed clean on the second. Cloud (`flows deploy`) confirmed to accept and listen; firing a real Linear ticket to trigger it wasn't exercised in this pass (no sandbox Linear write access at the time). `flows run --cloud` itself — a separate one-shot path, not the trigger — was broken for authored TS flows through `2.0.16` ([flows#461](https://github.com/AgentWorkforce/flows/issues/461), fixed in `2.0.17`).
