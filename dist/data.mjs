const API_ROOT = 'https://api.github.com/repos';

export function parseRepositoryUrl(input) {
  let url;
  try { url = new URL(input.trim()); } catch { throw new Error('Enter a complete GitHub repository URL, such as https://github.com/owner/repo.'); }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com' || url.username || url.password || url.port) {
    throw new Error('Use a public github.com repository URL.');
  }
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length !== 2 || !/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(parts[0]) || !/^[a-z\d._-]+$/i.test(parts[1])) {
    throw new Error('Use a repository URL in the form https://github.com/owner/repo.');
  }
  const repo = parts[1].replace(/\.git$/i, '');
  if (!repo || repo === '.' || repo === '..') throw new Error('Enter a valid repository name.');
  return { owner: parts[0], repo };
}

export function languageBreakdown(languages) {
  const entries = Object.entries(languages ?? {}).filter(([, bytes]) => Number.isFinite(bytes) && bytes > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  return entries.map(([name, bytes]) => ({ name, bytes, percentage: total ? bytes / total * 100 : 0 }));
}

export function commitDetails(commits) {
  return (Array.isArray(commits) ? commits : []).slice(0, 5).map(commit => ({
    message: (commit?.commit?.message || 'Untitled commit').split('\n')[0],
    author: commit?.commit?.author?.name || commit?.author?.login || 'Unknown author',
    date: commit?.commit?.author?.date || null,
    sha: commit?.sha?.slice(0, 7) || '',
    url: commit?.html_url || null
  }));
}

function apiError(response, remaining) {
  if (response.status === 404) return new Error('Repository not found. Check the URL and make sure the repository is public.');
  if (response.status === 403 || response.status === 429) return new Error(remaining === '0' || response.status === 429
    ? 'GitHub’s public API rate limit has been reached. Please try again later.'
    : 'GitHub could not complete this request. Please try again shortly.');
  return new Error('GitHub is temporarily unavailable. Please try again.');
}

async function getJson(url, signal) {
  let response;
  try { response = await fetch(url, { signal, headers: { Accept: 'application/vnd.github+json' } }); }
  catch (error) { if (error.name === 'AbortError') throw error; throw new Error('Could not connect to GitHub. Check your connection and try again.'); }
  if (!response.ok) {
    if (response.status === 409 && url.includes('/commits?')) return [];
    throw apiError(response, response.headers.get('x-ratelimit-remaining'));
  }
  return response.json();
}

export async function analyzeRepository({ owner, repo }, signal) {
  const base = `${API_ROOT}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const repository = await getJson(base, signal);
  const [languages, commits] = await Promise.all([
    getJson(`${base}/languages`, signal),
    getJson(`${base}/commits?per_page=5`, signal)
  ]);
  return { repository, languages: languageBreakdown(languages), commits: commitDetails(commits) };
}
