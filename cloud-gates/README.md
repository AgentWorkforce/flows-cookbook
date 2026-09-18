# cloud-gates

The smallest possible flow: one deterministic step, one output gate, runs the same way locally or hosted. Good for confirming a fresh Cloud deploy actually works before you build something that matters on top of it.

```bash
flows check cloud-gates.flow.yaml
flows run cloud-gates.flow.yaml
flows run --cloud --wait cloud-gates.flow.yaml
```

## Verified

Both legs run for real (2026-09-17): local `flows run` completed with `completionReason: success`; `flows run --cloud --wait` completed on Agent Relay Cloud with the same result.
