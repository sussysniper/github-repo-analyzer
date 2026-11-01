# Repository Atlas

A dark, responsive GitHub repository analyzer built with vanilla HTML, CSS, and JavaScript. Paste a public repository URL to see core repository metrics, language distribution, and the five latest commits.

## Run locally

Serve the `dist` directory with any static HTTP server, then open its local URL. For example, from the project root: `python -m http.server 8000 -d dist`. Modules require HTTP rather than opening `index.html` directly as a file. Run the focused tests with `npm test` (Node 20+). No install step or runtime dependency is required.

## Architecture

`dist/index.html` holds the semantic page structure. `dist/style.css` contains the responsive visual system. `dist/app.mjs` handles form states and safe DOM rendering. `dist/data.mjs` parses URLs, normalizes GitHub responses, and calls the official REST API. `tests/data.test.mjs` covers URL validation and important data cases.

The client requests `GET /repos/{owner}/{repo}`, `/languages`, and `/commits?per_page=5` from GitHub's public API. It stores no data or credentials. GitHub's `open_issues_count` includes pull requests, so the UI labels it **Open issues & PRs**. Language shares are based on GitHub's byte counts, not file counts.

## Limits

Only public repositories are available. Unauthenticated GitHub API requests are rate limited. A private or missing repository returns the same 404 response. Empty repositories may have no commits or language data. Network and rate limit errors are shown in the interface.

## Deploy

Upload the contents of `dist` to any free static host, or use the included Sites hosting manifest when deployed through Codex Sites. No build command, server, database, or environment variables are needed.
