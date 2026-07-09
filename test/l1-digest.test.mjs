import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonical, hash, render } from '../skills/skl-next/resources/l1-digest.mjs';

const base = {
  repo: 'ker0beros/skl', date: '2026-07-09',
  issuesByLabel: { 'loop-ready': [12, 3], 'loop-in-progress': [7] },
  openPRs: [{ number: 21, review: 'changes_requested' }],
  drift: ['constitution-missing'], nextStep: 'review PR #21', skipped: [],
};

test('hash ignores volatile fields (date, skipped)', () => {
  assert.equal(
    hash(base),
    hash({ ...base, date: '2030-01-01', skipped: [{ collector: 'prs', reason: 'x' }] }),
  );
});

test('hash ignores ordering of issue numbers', () => {
  assert.equal(
    hash(base),
    hash({ ...base, issuesByLabel: { 'loop-in-progress': [7], 'loop-ready': [3, 12] } }),
  );
});

test('hash changes on a real change', () => {
  assert.notEqual(hash(base), hash({ ...base, nextStep: 'start #99' }));
  assert.notEqual(hash(base), hash({ ...base, openPRs: [] }));
});

test('empty label buckets do not affect the hash', () => {
  assert.equal(
    hash(base),
    hash({ ...base, issuesByLabel: { ...base.issuesByLabel, 'loop-deferred': [] } }),
  );
});

test('hash is 12 lowercase hex chars', () => {
  assert.match(hash(base), /^[0-9a-f]{12}$/);
});

test('render embeds the exact hash marker', () => {
  const h = hash(base);
  assert.match(render(base, h), new RegExp(`<!-- skl-l1:${h} -->$`));
});

test('canonical is stable JSON (snapshot)', () => {
  assert.equal(
    canonical(base),
    '{"repo":"ker0beros/skl","labels":{"loop-in-progress":[7],"loop-ready":[3,12]},"prs":[{"number":21,"review":"changes_requested"}],"drift":["constitution-missing"],"nextStep":"review PR #21"}',
  );
});
