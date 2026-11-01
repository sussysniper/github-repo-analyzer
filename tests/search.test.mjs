import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchCoordinator } from '../dist/search.mjs';

function deferred() { let resolve; let reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }

test('newer search wins even when an older response arrives last', async () => {
  const gate = createSearchCoordinator();
  const older = deferred();
  const newer = deferred();
  const observed = [];
  const first = gate.run(() => older.promise, { success: value => observed.push(value), error: () => observed.push('error'), done: () => observed.push('done-old') });
  const second = gate.run(() => newer.promise, { success: value => observed.push(value), error: () => observed.push('error'), done: () => observed.push('done-new') });
  newer.resolve('new');
  await second;
  older.resolve('old');
  await first;
  assert.deepEqual(observed, ['new', 'done-new']);
});

test('cancelling a search suppresses a late success', async () => {
  const gate = createSearchCoordinator();
  const pending = deferred();
  const observed = [];
  const task = gate.run(() => pending.promise, { success: value => observed.push(value), error: () => observed.push('error') });
  gate.cancel();
  pending.resolve('late');
  await task;
  assert.deepEqual(observed, []);
});
