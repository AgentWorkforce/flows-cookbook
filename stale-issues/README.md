# stale-issues

On a schedule, look at every open issue in a repository, decide which are stale or need attention, and post one Slack digest. Staleness isn't "no activity for N days" — an issue can go quiet because nobody owns it, or because it's genuinely blocked; the model is asked for the difference, not just the silence.

```bash
flows schedule stale-issues.flow.ts \
  --cron "0 9 * * 1-5" --tz Europe/Oslo \
  --input '{"repo":"acme/api","channel":"#eng","staleDays":14}'
```

The issue list is fetched deterministically (journaled, replayable) and paginated in full; only the judgement is delegated to an LLM step, which must return schema-valid JSON. Links in the digest are built from the validated repo name and integer issue numbers only — a model can't forge a link or an `@mention` into the output.

## Verified

Run for real against [AgentWorkforce/relay](https://github.com/AgentWorkforce/relay) (2026-09-17, `flows run --local-agent`): fetched all 218 open issues, classified 50 as stale and 29 as needing attention, each with a one-sentence reason citing a concrete signal (days quiet, comment count, or a cross-reference to another open issue) rather than a generic "no activity." `completionReason: success`.

Slack delivery verified via the documented `RELAYFLOWS_SLACK_MOCK=1` local receipt — the digest was generated and formatted for real, but not posted to a live channel in this pass (see the cookbook root README for why).
