import { analyzeRepository, languageSegments, parseRepositoryUrl } from './data.mjs';
import { createSearchCoordinator } from './search.mjs';

const $ = id => document.getElementById(id);
const form = $('repo-form');
const input = $('repo-url');
const button = $('analyze-button');
const feedback = $('feedback');
const empty = $('empty-state');
const loading = $('loading-state');
const results = $('results');
const coordinator = createSearchCoordinator();
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const number = value => value === null ? '—' : new Intl.NumberFormat().format(value);
const date = value => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'Date unavailable';
const tones = ['#f18a76', '#d58a7a', '#b77d72', '#9e746e', '#846b69', '#6d6265', '#59565c'];
const svgNS = 'http://www.w3.org/2000/svg';
let metricFrames = [];

function setFeedback(message, kind = 'error') {
  feedback.hidden = !message;
  feedback.className = `feedback ${kind}`;
  feedback.textContent = message;
  feedback.setAttribute('role', kind === 'error' ? 'alert' : 'status');
}

function setLoading(active) {
  loading.hidden = !active;
  form.setAttribute('aria-busy', String(active));
  $('button-label').textContent = active ? 'Analyzing…' : 'Analyze repository';
  button.classList.toggle('is-loading', active);
}

function animateMetric(id, value) {
  const element = $(id);
  if (value === null || motion.matches) { element.textContent = number(value); return; }
  const start = performance.now();
  const duration = 600;
  const step = now => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = number(Math.round(value * eased));
    if (progress < 1) metricFrames.push(requestAnimationFrame(step));
  };
  metricFrames.push(requestAnimationFrame(step));
}

function svg(tag, attributes = {}) {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function renderLanguages(languages) {
  const chart = $('language-chart');
  const list = $('language-list');
  chart.replaceChildren();
  list.replaceChildren();
  if (!languages.length) {
    const message = document.createElement('p');
    message.className = 'chart-empty';
    message.textContent = 'No language data is available for this repository.';
    chart.append(message);
    return;
  }
  const displayed = languageSegments(languages);
  const graphic = svg('svg', { class: 'chart-svg', viewBox: '0 0 1000 40', preserveAspectRatio: 'none', role: 'img', 'aria-label': `Language distribution by bytes: ${displayed.map(item => `${item.name} ${item.percentage.toFixed(1)} percent`).join(', ')}` });
  let x = 0;
  displayed.forEach((item, index) => {
    const width = item.percentage * 10;
    const group = svg('g', { tabindex: '0', role: 'img', 'aria-label': `${item.name}: ${item.percentage.toFixed(1)} percent` });
    const rectangle = svg('rect', { x: x + (index ? 1.5 : 0), y: 2, width: Math.max(.5, width - (index ? 1.5 : 0)), height: 36, rx: 2, fill: tones[index] });
    const title = svg('title');
    title.textContent = `${item.name}: ${item.percentage.toFixed(1)}%`;
    group.append(rectangle, title);
    graphic.append(group);
    x += width;
  });
  chart.append(graphic);
  displayed.forEach((item, index) => {
    const row = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'language-name';
    const swatch = svg('svg', { class: 'language-swatch', viewBox: '0 0 9 9' });
    swatch.append(svg('rect', { width: 9, height: 9, rx: 2, fill: tones[index] }));
    swatch.setAttribute('aria-hidden', 'true');
    label.append(swatch, document.createTextNode(item.name));
    const share = document.createElement('strong');
    share.textContent = `${item.percentage.toFixed(1)}%`;
    row.append(label, share);
    list.append(row);
  });
}

function renderActivity(commits) {
  const container = $('commit-activity');
  container.replaceChildren();
  if (!commits.length) return;
  const graphic = svg('svg', { class: 'activity-svg', viewBox: '0 0 1000 64', preserveAspectRatio: 'none', role: 'img', 'aria-label': `${commits.length} latest commits in newest-to-oldest sequence. Dates and authors are listed below.` });
  graphic.append(svg('line', { x1: 16, y1: 32, x2: 984, y2: 32 }));
  commits.forEach((commit, index) => {
    const x = commits.length === 1 ? 500 : 16 + index * 968 / (commits.length - 1);
    const point = svg('g', { tabindex: '0', role: 'img', 'aria-label': `${commit.message}, ${commit.author}, ${date(commit.date)}` });
    point.append(svg('circle', { cx: x, cy: 32, r: 7 }));
    const title = svg('title');
    title.textContent = `${commit.message} — ${date(commit.date)}`;
    point.append(title);
    graphic.append(point);
  });
  const caption = document.createElement('div');
  caption.className = 'activity-caption';
  const newest = document.createElement('span'); newest.textContent = 'NEWEST';
  const older = document.createElement('span'); older.textContent = 'OLDER';
  caption.append(newest, older);
  container.append(graphic, caption);
}

function renderCommits(commits) {
  const list = $('commit-list');
  list.replaceChildren();
  renderActivity(commits);
  if (!commits.length) {
    const row = document.createElement('li');
    row.className = 'no-commits';
    row.textContent = 'No commits are available for this repository yet.';
    list.append(row);
    return;
  }
  commits.forEach(commit => {
    const row = document.createElement('li');
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
    row.append(content, sha);
    list.append(row);
  });
}

function show({ repository: repo, languages, commits }) {
  metricFrames.forEach(cancelAnimationFrame);
  metricFrames = [];
  $('repo-name').textContent = repo.fullName;
  $('repo-description').textContent = repo.description || 'No description provided for this repository.';
  const link = $('repo-link');
  link.hidden = !repo.url;
  if (repo.url) link.href = repo.url;
  else link.removeAttribute('href');
  $('updated-at').textContent = repo.updatedAt ? `UPDATED ${date(repo.updatedAt).toUpperCase()}` : 'UPDATE DATE UNAVAILABLE';
  animateMetric('stat-stars', repo.stars);
  animateMetric('stat-forks', repo.forks);
  animateMetric('stat-issues', repo.openIssuesAndPrs);
  $('stat-language').textContent = repo.primaryLanguage || '—';
  renderLanguages(languages);
  renderCommits(commits);
  loading.hidden = true;
  results.hidden = false;
  results.classList.remove('enter');
  requestAnimationFrame(() => results.classList.add('enter'));
}

form.addEventListener('submit', event => {
  event.preventDefault();
  let parsed;
  try { parsed = parseRepositoryUrl(input.value); }
  catch (error) {
    coordinator.cancel();
    setLoading(false);
    results.hidden = true;
    empty.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', 'input-help feedback');
    setFeedback(error.message);
    input.focus();
    return;
  }
  input.removeAttribute('aria-invalid');
  input.setAttribute('aria-describedby', 'input-help');
  empty.hidden = true;
  results.hidden = true;
  setLoading(true);
  setFeedback('Fetching the repository from GitHub…', 'loading');
  coordinator.run(signal => analyzeRepository(parsed, signal), {
    success(data) { show(data); setFeedback('Analysis complete.', 'success'); },
    error(error) { empty.hidden = false; setFeedback(error.message); },
    done() { setLoading(false); }
  });
});

input.addEventListener('input', () => {
  input.removeAttribute('aria-invalid');
  input.setAttribute('aria-describedby', 'input-help');
  if (feedback.classList.contains('error')) setFeedback('');
});
