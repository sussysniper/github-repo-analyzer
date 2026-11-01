import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeRepository, commitDetails, languageBreakdown, languageSegments, normalizeRepository, parseRepositoryUrl, safeGitHubUrl } from '../dist/data.mjs';

const payloads = [
  'javascript:alert(1)',
  'data:text/html,<svg onload=alert(1)>',
  'https://github.com.evil.test/a/b',
  'https://github.com/a/%2e%2e/b',
  'https://github.com/a/b?redirect=javascript:alert(1)',
  'https://github.com/a/b#fragment',
  'https://user@github.com/a/b',
  'https://github.com/a/b/../c',
  'https://github.com/a//b'
];

test('rejects malicious and noncanonical repository input', () => {
  for (const value of payloads) assert.throws(() => parseRepositoryUrl(value), value);
});

test('rejects unsafe API-provided repository and commit links', () => {
  for (const value of payloads) assert.equal(safeGitHubUrl(value), null, value);
  assert.equal(safeGitHubUrl('https://github.com/a/b/commit/' + 'a'.repeat(40), 'commit')?.startsWith('https://github.com/'), true);
  assert.equal(safeGitHubUrl('javascript:alert(1)', 'commit'), null);
  assert.equal(safeGitHubUrl('https://github.com/a/b/commit/not-a-sha', 'commit'), null);
});

test('untrusted strings stay data and unsafe links are removed', () => {
  const attack = '<svg onload=alert(1)><script>alert(2)</script>';
  const repository = normalizeRepository({ full_name: 'safe/repo', description: attack, html_url: 'javascript:alert(1)', stargazers_count: -1 });
  assert.equal(repository.description, attack);
  assert.equal(repository.url, null);
  assert.equal(repository.stars, null);
  const commits = commitDetails([{ sha: 'a'.repeat(40), html_url: 'data:text/html,<script>alert(1)</script>', commit: { message: attack, author: { name: attack } } }]);
  assert.equal(commits[0].message, attack);
  assert.equal(commits[0].author, attack);
  assert.equal(commits[0].url, null);
  const view = readFileSync(new URL('../dist/app.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(view, /\.innerHTML\s*=|\beval\s*\(|new\s+Function\s*\(/);
  assert.match(view, /\.textContent\s*=/);
});

test('ignores malformed language totals and incomplete repository data', () => {
  assert.deepEqual(languageBreakdown(['JavaScript']), []);
  assert.deepEqual(languageBreakdown({ A: -3, B: '7', C: 5 }), [{ name: 'C', bytes: 5, percentage: 100 }]);
  assert.throws(() => normalizeRepository(null), /incomplete/);
  assert.throws(() => normalizeRepository({ full_name: '<script>' }), /incomplete/);
});

test('chart segments preserve the real language total', () => {
  const languages = languageBreakdown({ A: 40, B: 20, C: 15, D: 10, E: 5, F: 5, G: 3, H: 2 });
  const segments = languageSegments(languages);
  assert.equal(segments.length, 7);
  assert.equal(segments.at(-1).name, 'Other languages');
  assert.ok(Math.abs(segments.reduce((sum, item) => sum + item.percentage, 0) - 100) < 1e-9);
});

test('bounded requests use only GitHub API endpoints and reject network failures', async () => {
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url, options) => { urls.push(url); assert.equal(options.redirect, 'error'); throw new TypeError('private network detail'); };
  try {
    await assert.rejects(analyzeRepository({ owner: 'safe', repo: 'repo' }), /Could not connect/);
    assert.deepEqual(urls, ['https://api.github.com/repos/safe/repo']);
    await assert.rejects(analyzeRepository({ owner: 'a/b', repo: 'repo' }), /public repository URL/);
  } finally { globalThis.fetch = original; }
});

test('missing repositories and unreadable API data give controlled errors', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: false, status: 404, headers: new Headers() });
    await assert.rejects(analyzeRepository({ owner: 'a', repo: 'b' }), /Repository not found/);
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('private parser detail'); } });
    await assert.rejects(analyzeRepository({ owner: 'a', repo: 'b' }), /unreadable data/);
  } finally { globalThis.fetch = original; }
});

test('abort prevents extra API requests after a cancelled search', async () => {
  const original = globalThis.fetch;
  const controller = new AbortController();
  let count = 0;
  globalThis.fetch = async () => { count++; controller.abort(); return { ok: true, json: async () => ({ full_name: 'a/b' }) }; };
  try { await assert.rejects(analyzeRepository({ owner: 'a', repo: 'b' }, controller.signal), /aborted/i); assert.equal(count, 1); }
  finally { globalThis.fetch = original; }
});

test('reduced motion has an explicit style and numerical animation bypass', () => {
  const css = readFileSync(new URL('../dist/style.css', import.meta.url), 'utf8');
  const view = readFileSync(new URL('../dist/app.mjs', import.meta.url), 'utf8');
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(view, /motion\.matches/);
});

test('restrictive Vercel CSP has no unsafe inline or eval exceptions', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const headers = config.headers[0].headers;
  const csp = headers.find(item => item.key === 'Content-Security-Policy').value;
  assert.match(csp, /connect-src https:\/\/api\.github\.com/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
});
