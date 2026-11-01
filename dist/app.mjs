import { analyzeRepository, parseRepositoryUrl } from './data.mjs';

const $ = id => document.getElementById(id);
const form = $('repo-form');
const input = $('repo-url');
const button = $('analyze-button');
const feedback = $('feedback');
const empty = $('empty-state');
const results = $('results');
let activeRequest;
const number = value => new Intl.NumberFormat().format(value ?? 0);
const date = value => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'Date unavailable';

function setFeedback(message, kind = 'error') {
  feedback.hidden = !message;
  feedback.className = `feedback ${kind}`;
  feedback.textContent = message;
}

function setLoading(isLoading) {
  button.disabled = isLoading;
  button.classList.toggle('is-loading', isLoading);
  button.firstChild.textContent = isLoading ? 'Analyzing repository ' : 'Analyze repository ';
  form.setAttribute('aria-busy', String(isLoading));
}

function show(data) {
  const { repository: repo, languages, commits } = data;
  empty.hidden = true;
  results.hidden = false;
  $('repo-name').textContent = repo.full_name;
  $('repo-description').textContent = repo.description || 'No description provided for this repository.';
  $('repo-link').href = repo.html_url;
  $('updated-at').textContent = `UPDATED ${date(repo.updated_at).toUpperCase()}`;
  $('stat-stars').textContent = number(repo.stargazers_count);
  $('stat-forks').textContent = number(repo.forks_count);
  $('stat-issues').textContent = number(repo.open_issues_count);
  $('stat-language').textContent = repo.language || '—';

  const chart = $('language-chart');
  const list = $('language-list');
  chart.replaceChildren();
  list.replaceChildren();
  if (!languages.length) {
    chart.classList.add('chart-empty');
    chart.textContent = 'No language data available';
  } else {
    chart.classList.remove('chart-empty');
    chart.setAttribute('role', 'img');
    chart.setAttribute('aria-label', `Language distribution: ${languages.map(item => `${item.name} ${item.percentage.toFixed(1)}%`).join(', ')}`);
    languages.forEach((item, index) => {
      const segment = document.createElement('span');
      segment.style.width = `${item.percentage}%`;
      segment.style.backgroundColor = palette[index % palette.length];
      segment.title = `${item.name}: ${item.percentage.toFixed(1)}%`;
      chart.append(segment);
    });
    languages.slice(0, 6).forEach((item, index) => {
      const row = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'language-name';
      const dot = document.createElement('i');
      dot.style.backgroundColor = palette[index % palette.length];
      dot.setAttribute('aria-hidden', 'true');
      name.append(dot, document.createTextNode(item.name));
      const share = document.createElement('strong');
      share.textContent = `${item.percentage.toFixed(1)}%`;
      row.append(name, share);
      list.append(row);
    });
    if (languages.length > 6) {
      const other = document.createElement('li');
      other.className = 'other-languages';
      other.textContent = `+ ${languages.length - 6} more languages in distribution`;
      list.append(other);
    }
  }

  const commitList = $('commit-list');
  commitList.replaceChildren();
  if (!commits.length) {
    const item = document.createElement('li');
    item.className = 'no-commits';
    item.textContent = 'No commits are available for this repository yet.';
    commitList.append(item);
  } else commits.forEach(commit => {
    const item = document.createElement('li');
    const content = document.createElement('div');
    const title = document.createElement(commit.url ? 'a' : 'span');
    title.className = 'commit-message';
    title.textContent = commit.message;
    if (commit.url) { title.href = commit.url; title.target = '_blank'; title.rel = 'noopener noreferrer'; }
    const meta = document.createElement('span');
    meta.className = 'commit-meta';
    meta.textContent = `${commit.author} · ${date(commit.date)}`;
    content.append(title, meta);
    const sha = document.createElement('span');
    sha.className = 'commit-sha';
    sha.textContent = commit.sha;
    item.append(content, sha);
    commitList.append(item);
  });
}

const palette = ['#b8d7a1', '#7fada3', '#d4aa79', '#9eabc2', '#a890a4', '#c8c7a0', '#7796a6', '#b38e80'];

form.addEventListener('submit', async event => {
  event.preventDefault();
  activeRequest?.abort();
  let parsed;
  try { parsed = parseRepositoryUrl(input.value); }
  catch (error) { input.setAttribute('aria-invalid', 'true'); setFeedback(error.message); input.focus(); return; }
  input.removeAttribute('aria-invalid');
  const controller = new AbortController();
  activeRequest = controller;
  setLoading(true);
  setFeedback('Fetching repository details from GitHub…', 'loading');
  try {
    const data = await analyzeRepository(parsed, controller.signal);
    if (activeRequest !== controller) return;
    show(data);
    setFeedback('Analysis complete.', 'success');
  } catch (error) {
    if (error.name !== 'AbortError') {
      empty.hidden = !results.hidden;
      setFeedback(error.message);
    }
  } finally {
    if (activeRequest === controller) { activeRequest = null; setLoading(false); }
  }
});

input.addEventListener('input', () => { input.removeAttribute('aria-invalid'); if (feedback.classList.contains('error')) setFeedback(''); });
