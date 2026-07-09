#!/usr/bin/env node
// skl L1 digest — pure transform: state JSON on stdin → {hash, body} JSON on stdout.
// No network, no side effects. Caller: skills/skl-next/resources/l1-post.md
import { createHash } from 'node:crypto';

const sortNums = (a) => [...(a || [])].map(Number).sort((x, y) => x - y);

// Volatile-free canonical projection → stable string for hashing.
// Excludes `date` and `skipped` (volatile); omits empty label buckets so absent === empty.
export function canonical(state) {
  const labels = {};
  for (const k of Object.keys(state.issuesByLabel || {}).sort()) {
    const v = sortNums(state.issuesByLabel[k]);
    if (v.length) labels[k] = v;
  }
  const prs = [...(state.openPRs || [])]
    .map((p) => ({ number: Number(p.number), review: String(p.review || '') }))
    .sort((a, b) => a.number - b.number);
  const drift = [...(state.drift || [])].map(String).sort();
  return JSON.stringify({
    repo: state.repo || '',
    labels,
    prs,
    drift,
    nextStep: String(state.nextStep || '').trim(),
  });
}

export function hash(state) {
  return createHash('sha256').update(canonical(state)).digest('hex').slice(0, 12);
}

export function render(state, h) {
  const lb = state.issuesByLabel || {};
  const n = (k) => (lb[k] || []).length;
  const prs = state.openPRs || [];
  const out = [
    `### ${state.date} — L1 triage`,
    '',
    '_L1 report-only — no actions taken._',
    '',
    '**Current state**',
    `- loop-ready ${n('loop-ready')} · in-progress ${n('loop-in-progress')} · needs-info ${n('loop-needs-info')} · needs-human ${n('loop-human')} · deferred ${n('loop-deferred')}`,
    `- open skl-do PRs: ${prs.length ? prs.map((p) => `#${p.number} (${p.review})`).join(', ') : 'none'}`,
  ];
  if ((state.drift || []).length) out.push(`- drift: ${state.drift.join(', ')}`);
  out.push('', `**Next step:** ${state.nextStep || '—'}`);
  if ((state.skipped || []).length) {
    out.push('', `_Skipped: ${state.skipped.map((s) => `${s.collector} (${s.reason})`).join('; ')}_`);
  }
  out.push('', `<!-- skl-l1:${h} -->`);
  return out.join('\n');
}

// CLI: stdin state JSON → stdout { hash, body }
if (import.meta.url === `file://${process.argv[1]}`) {
  let data = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) data += chunk;
  const state = JSON.parse(data);
  const h = hash(state);
  process.stdout.write(JSON.stringify({ hash: h, body: render(state, h) }));
}
