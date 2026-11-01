const API_ROOT = 'https://api.github.com/repos';
const OWNER = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
const REPO = /^[a-z\d._-]{1,100}$/i;
const SHA = /^[a-f\d]{40}$/i;

function invalidUrl() { return new Error('Enter a public repository URL like https://github.com/owner/repo.'); }

export function parseRepositoryUrl(input) {
  if (typeof input !== 'string') throw invalidUrl();
  const raw = input.trim();
  // Match the raw path as well: URL() silently normalizes dot segments and encoded paths.
  const match = /^https:\/\/github\.com\/([^/?#]+)\/([^/?#]+)\/?$/i.exec(raw);
  if (!match) throw invalidUrl();
  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, '');
  if (!OWNER.test(owner) || !REPO.test(repo) || repo === '.' || repo === '..') throw invalidUrl();
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password || url.port || url.search || url.hash) throw invalidUrl();
  return { owner, repo };
}

export function safeGitHubUrl(input, kind = 'repository') {
  if (typeof input !== 'string') return null;
  const raw = kind === 'commit'
    ? /^https:\/\/github\.com\/([^/?#]+)\/([^/?#]+)\/commit\/([a-f\d]{40})\/?$/i.exec(input)
    : /^https:\/\/github\.com\/([^/?#]+)\/([^/?#]+)\/?$/i.exec(input);
  if (!raw || !OWNER.test(raw[1]) || !REPO.test(raw[2])) return null;
  let url;
  try { url = new URL(input); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (!OWNER.test(parts[0] ?? '') || !REPO.test(parts[1] ?? '')) return null;
  if (kind === 'repository' && parts.length !== 2) return null;
  if (kind === 'commit' && (parts.length !== 4 || parts[2] !== 'commit' || !SHA.test(parts[3]))) return null;
  return url.href;
}

function validCount(value) { return Number.isSafeInteger(value) && value >= 0 ? value : null; }
function validText(value) { return typeof value === 'string' ? value : null; }
function validDate(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null; }

export function normalizeRepository(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('GitHub returned incomplete repository data. Please try again.');
  const fullName = validText(value.full_name);
  if (!fullName || !/^[a-z\d-]+\/[a-z\d._-]+$/i.test(fullName)) throw new Error('GitHub returned incomplete repository data. Please try again.');
  return {
    fullName,
    description: validText(value.description),
    url: safeGitHubUrl(value.html_url),
    stars: validCount(value.stargazers_count),
    forks: validCount(value.forks_count),
    openIssuesAndPrs: validCount(value.open_issues_count),
    primaryLanguage: validText(value.language),
    updatedAt: validDate(value.updated_at)
  };
}

export function languageBreakdown(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const entries = Object.entries(value).filter(([name, bytes]) => name.length <= 80 && Number.isSafeInteger(bytes) && bytes > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (!Number.isFinite(total)) return [];
  return entries.map(([name, bytes]) => ({ name, bytes, percentage: total ? bytes / total * 100 : 0 }));
}

export function languageSegments(languages, maxVisible = 6) {
  const visible = languages.slice(0, maxVisible);
  const other = languages.slice(maxVisible);
  const otherShare = other.reduce((sum, item) => sum + item.percentage, 0);
  return otherShare ? [...visible, { name: 'Other languages', percentage: otherShare }] : visible;
}

export function commitDetails(value) {
  return (Array.isArray(value) ? value : []).slice(0, 5).map(item => {
    const sha = validText(item?.sha);
    const message = validText(item?.commit?.message);
    const author = validText(item?.commit?.author?.name) || validText(item?.author?.login);
    return {
      message: message?.split('\n')[0] || 'Untitled commit',
      author: author || 'Unknown author',
      date: validDate(item?.commit?.author?.date),
      sha: sha && SHA.test(sha) ? sha.slice(0, 7) : '',
      url: safeGitHubUrl(item?.html_url, 'commit')
    };
  });
}

function apiError(response) {
  if (response.status === 404) return new Error('Repository not found. Check the URL and make sure it is public.');
  if (response.status === 403 || response.status === 429) return new Error(response.headers?.get('x-ratelimit-remaining') === '0' || response.status === 429
    ? 'GitHub’s public API rate limit has been reached. Please wait and try again.'
    : 'GitHub is limiting requests right now. Please try again shortly.');
  return new Error('GitHub could not complete the request. Please try again.');
}

async function getJson(url, signal, allowEmptyCommits = false) {
  if (signal?.aborted) {
    if (signal.reason?.name === 'TimeoutError') throw new Error('GitHub took too long to respond. Please try again.');
    throw signal.reason;
  }
  let response;
  try {
    response = await fetch(url, { signal, redirect: 'error', headers: { Accept: 'application/vnd.github+json' } });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    if (error?.name === 'TimeoutError') throw new Error('GitHub took too long to respond. Please try again.');
    throw new Error('Could not connect to GitHub. Check your connection and try again.');
  }
  if (signal?.aborted) {
    if (signal.reason?.name === 'TimeoutError') throw new Error('GitHub took too long to respond. Please try again.');
    throw signal.reason;
  }
  if (allowEmptyCommits && response.status === 409) return [];
  if (!response.ok) throw apiError(response);
  try { return await response.json(); }
  catch { throw new Error('GitHub returned unreadable data. Please try again.'); }
}

export async function analyzeRepository({ owner, repo }, externalSignal) {
  if (!OWNER.test(owner ?? '') || !REPO.test(repo ?? '')) throw invalidUrl();
  const timeout = AbortSignal.timeout(15000);
  const signal = externalSignal ? AbortSignal.any([externalSignal, timeout]) : timeout;
  const base = `${API_ROOT}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  // Three bounded requests, in sequence, avoid unnecessary parallel API pressure.
  const repository = normalizeRepository(await getJson(base, signal));
  const languages = languageBreakdown(await getJson(`${base}/languages`, signal));
  const commits = commitDetails(await getJson(`${base}/commits?per_page=5`, signal, true));
  return { repository, languages, commits };
}
