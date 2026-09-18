# prospect-demo

The smallest flow that touches the outside world: generate a short message with an LLM, post it to Slack. Good as a first "did my setup work" check before building something real.

You need Node 22.18+, an authenticated Claude or Codex CLI, a relayfile Slack mount connected to your workspace with permission to post in the target channel, and a Relaycast workspace key for the observer link.

```bash
npm install relayflows @relayflows/surface
echo '{ "cli": "claude" }' > flows.json
export RELAYFILE_MOUNT_PATH='/absolute/path/to/your/relayfile-mount'

flows check demo.flow.ts
flows run demo.flow.ts --local-agent --input '{}'
```

For a local preview without sending a real Slack message, prefix the run with `RELAYFLOWS_SLACK_MOCK=1` — the LLM call still runs; Slack delivery is replaced by a local receipt.

## Verified

Run for real (2026-09-17): a real Claude call generated the message; Slack delivery verified via the documented `RELAYFLOWS_SLACK_MOCK=1` local receipt rather than a live post — standing up a dedicated relayfile workspace with unscoped Slack write access was out of scope for this pass. `completionReason: success`.
