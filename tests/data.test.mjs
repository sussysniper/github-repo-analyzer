import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRepositoryUrl, languageBreakdown, commitDetails, analyzeRepository } from '../dist/data.mjs';

test('parses a public repository URL and strips .git', () => {
  assert.deepEqual(parseRepositoryUrl(' https://github.com/octocat/Hello-World.git '), { owner: 'octocat', repo: 'Hello-World' });
});
test('rejects non-repository and off-domain URLs', () => {
  for (const value of ['hello', 'http://github.com/a/b', 'https://github.com.evil.com/a/b', 'https://github.com/a/b/issues', 'https://github.com/a', 'https://user@github.com/a/b']) {
    assert.throws(() => parseRepositoryUrl(value));
  }
});
test('sorts languages by bytes and computes accurate shares', () => {
  assert.deepEqual(languageBreakdown({ CSS: 25, JavaScript: 75 }).map(({ name, percentage }) => [name, percentage]), [['JavaScript', 75], ['CSS', 25]]);
  assert.deepEqual(languageBreakdown({}), []);
});
test('keeps five commits and uses safe fallbacks', () => {
  const commits = Array.from({ length: 6 }, (_, i) => ({ sha: `${i}123456789`, commit: { message: `Commit ${i}\nbody`, author: { name: 'Ada', date: '2024-01-01' } } }));
  assert.equal(commitDetails(commits).length, 5);
  assert.equal(commitDetails(commits)[0].message, 'Commit 0');
  assert.equal(commitDetails([{}])[0].author, 'Unknown author');
});
test('handles an empty repository without failing commits', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async url => ({ ok: !url.includes('/commits?'), status: 409, headers: new Headers(), json: async () => url.endsWith('/languages') ? {} : { full_name: 'a/b' } });
  try { const data = await analyzeRepository({ owner: 'a', repo: 'b' }); assert.deepEqual(data.commits, []); }
  finally { globalThis.fetch = original; }
});
test('reports rate limits clearly', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 403, headers: new Headers({ 'x-ratelimit-remaining': '0' }) });
  try { await assert.rejects(analyzeRepository({ owner: 'a', repo: 'b' }), /rate limit/); }
  finally { globalThis.fetch = original; }
});
