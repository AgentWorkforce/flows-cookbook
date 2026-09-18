// stale-prs — on a schedule, look at every open pull request in a repository,
// classify who owes the next move, and post one Slack digest.
//
// Staleness is not "no activity for N days" — a PR waiting on a reviewer and
// an abandoned branch can both go quiet for two weeks; one needs a nudge, the
// other needs closing. So the model is asked whose turn it is, not just how
// long it's been silent, and every PR lands in exactly one bucket:
//   ready-to-merge  — approved, checks green, nothing blocking
//   needs-review    — waiting on a reviewer
//   needs-author    — waiting on the author (changes requested, CI red, merge conflict)
//   abandoned       — no clear owner and no realistic next step; candidate to close
//
// Deploy on a schedule:
//   flows schedule examples/stale-prs/stale-prs.flow.ts \
//     --cron "0 9 * * 1-5" --tz Europe/Oslo \
//     --input '{"repo":"acme/api","channel":"#eng","staleDays":14}'
//
// The PR list is fetched deterministically (journaled, replayable); only the
// judgement is delegated to an LLM step, which must return schema-valid JSON.
import { flow } from "@relayflows/surface";

type Input = { repo: string; channel: string; staleDays?: number };
type Finding = { number: number; title: string; reason: string };
type Triage = {
  readyToMerge: Finding[];
  needsReview: Finding[];
  needsAuthor: Finding[];
  abandoned: Finding[];
};

const REPO = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;

// Follows GitHub's pagination (oldest-updated first) so a repository with more
// than 100 open PRs is triaged in full. Runs under node, not the shell: the
// repository name never touches /bin/sh unquoted, and it is validated before
// it gets here at all. Review/check state is fetched per PR so the model
// judges real signals (mergeable, review decision, CI conclusion), not guesses.
const FETCH_PRS = `node -e '
const repo = process.argv.at(-1);
const headers = { authorization: "Bearer " + process.env.GH_TOKEN, "user-agent": "relayflows-stale-prs", accept: "application/vnd.github+json" };
(async () => {
  const out = []; const now = Date.now();
  for (let page = 1; page <= 20; page++) {
    const res = await fetch("https://api.github.com/repos/" + repo + "/pulls?state=open&sort=updated&direction=asc&per_page=100&page=" + page, { headers });
    if (!res.ok) { console.error("GitHub " + res.status); process.exit(1); }
    const batch = await res.json();
    for (const p of batch) {
      let mergeable_state = "unknown", review_decision = null;
      try {
        const detail = await (await fetch("https://api.github.com/repos/" + repo + "/pulls/" + p.number, { headers })).json();
        mergeable_state = detail.mergeable_state ?? "unknown";
      } catch {}
      out.push({
        number: p.number, title: p.title, draft: p.draft,
        updatedDaysAgo: Math.floor((now - Date.parse(p.updated_at)) / 864e5),
        mergeable_state, labels: p.labels.map(l => l.name),
      });
    }
    if (batch.length < 100) break;
  }
  console.log(JSON.stringify(out));
})();'`;

const FINDING_SCHEMA = {
  type: "object", required: ["number", "title", "reason"], additionalProperties: false,
  properties: { number: { type: "integer", minimum: 1 }, title: { type: "string", maxLength: 200 }, reason: { type: "string", maxLength: 200 } },
};

// Slack mrkdwn: text from the model is escaped so it cannot forge links,
// mentions or control sequences; links are built from the validated repo and
// integer PR number only.
const mrkdwn = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default flow<Input>("stale-prs", { budget: { dollars: 2, wallclock: "10m" }, tools: { slack: true } }, async (f, input) => {
  if (!REPO.test(input.repo)) {
    await f.run("echo 'Stopped: repo must be owner/name.' >&2");
    return f.done("needs_human");
  }
  const staleDays = Math.max(1, Math.min(365, Math.trunc(input.staleDays ?? 14)));
  const prs = await f.run(`${FETCH_PRS} '${input.repo}'`, { timeout: "5m" });
  const list = JSON.parse(prs) as { number: number; draft: boolean }[];
  const open = list.filter(p => !p.draft);
  if (open.length === 0) return f.done("success");
  const known = new Set(open.map(p => p.number));

  const triage = await f.llm(
    `Here are the open, non-draft pull requests of ${input.repo} as JSON: ${JSON.stringify(open)}\n` +
    `Staleness is about whose turn it is, not just how long it's been quiet. Classify every PR into exactly one bucket:\n` +
    `- readyToMerge: mergeable_state is "clean" and nothing else is blocking\n` +
    `- needsReview: waiting on a reviewer, no blocking signal from the author's side\n` +
    `- needsAuthor: mergeable_state is "dirty"/"blocked", or labels suggest changes requested or CI failure\n` +
    `- abandoned: quiet for ${staleDays}+ days with no clear owner or realistic next step — a candidate to close, not to nudge\n` +
    `Return JSON {readyToMerge,needsReview,needsAuthor,abandoned}, each an array of {number,title,reason}; keep reasons to one sentence and name the concrete signal (mergeable_state, days quiet, label) you used.`,
    { output: { type: "object", required: ["readyToMerge", "needsReview", "needsAuthor", "abandoned"], additionalProperties: false, properties: {
      readyToMerge: { type: "array", maxItems: 50, items: FINDING_SCHEMA },
      needsReview: { type: "array", maxItems: 50, items: FINDING_SCHEMA },
      needsAuthor: { type: "array", maxItems: 50, items: FINDING_SCHEMA },
      abandoned: { type: "array", maxItems: 50, items: FINDING_SCHEMA },
    } } },
  ) as Triage;

  // Only PRs that were actually fetched can appear in the digest.
  const line = (p: Finding) =>
    `• <https://github.com/${input.repo}/pull/${p.number}|#${p.number}> ${mrkdwn(p.title)} — ${mrkdwn(p.reason)}`;
  const section = (title: string, items: Finding[]) => {
    const filtered = items.filter(i => known.has(i.number));
    return filtered.length ? `\n*${title} (${filtered.length})*\n${filtered.map(line).join("\n")}` : "";
  };
  const digest = [
    `*${mrkdwn(input.repo)}: ${open.length} open PRs* (stale after ${staleDays} days)`,
    section("Ready to merge", triage.readyToMerge),
    section("Needs review", triage.needsReview),
    section("Needs author", triage.needsAuthor),
    section("Abandoned — consider closing", triage.abandoned),
  ].join("\n") || `*${mrkdwn(input.repo)}*: nothing to report.`;

  await f.slack.post(input.channel, digest);
  f.done("success");
});
