# Repository Atlas

Repository Atlas is an independent, static GitHub repository analyzer. Enter a public `https://github.com/owner/repo` URL to see repository metrics, language composition, and the latest five commits in a responsive editorial interface.

## Features

- Repository description, stars, forks, GitHub's combined **open issues and pull requests** count, and primary language.
- Language distribution calculated from GitHub's reported bytes, with a keyboard-readable chart and text legend.
- Up to five recent commits with messages, authors, dates, and a sequence diagram. The diagram shows order, **not** a fabricated time trend.
- Clear loading, empty, success, error, rate-limit, and empty-repository states.
- Reduced-motion behavior, visible keyboard focus, no visitor account, and no analytics scripts.

## Run and test

Use any static server to serve `dist/`, for example `npx serve dist`. Opening the HTML file directly is insufficient because it imports JavaScript modules. Node 20+ is needed for the tests:

```sh
npm test
```

There are no runtime packages and no build step. `dist/index.html` is the page; `dist/style.css` is the design system; `dist/app.mjs` renders safe DOM nodes; `dist/data.mjs` validates input and GitHub API responses; `dist/search.mjs` prevents stale search results. Tests live in `tests/`.

## Data and security

The browser makes at most three sequential unauthenticated requests per analysis to the official [GitHub REST API](https://docs.github.com/en/rest): repository details, languages, and `commits?per_page=5`. No token or secret is embedded. GitHub limits unauthenticated traffic by source IP; the app shows rate-limit errors instead of retrying automatically. Untrusted text is inserted with `textContent`, external links are restricted to validated HTTPS GitHub URLs, and Vercel sets a restrictive CSP and other response headers in `vercel.json`. See [SECURITY.md](SECURITY.md) for the threat model, review, and residual risks.

## Privacy and attribution

The app does not store searches, set its own cookies, or load analytics. Requests still expose ordinary request data to Vercel (hosting) and GitHub (API). Read the visitor-facing [privacy notice](dist/privacy.html). Repository Atlas is not affiliated with or endorsed by GitHub or the named design inspirations. The design and favicon are original. No separate terms of service are provided for this simple informational site; obtain legal advice if the product or data practices change.

## Deploy on Vercel

Import the **existing** GitHub repository as a Vercel project, choose Framework Preset **Other**, leave the build command empty, and use `dist` as the output directory. `vercel.json` specifies the output directory and security headers. Vercel preview deployments can be reviewed before production publication. Check the actual response headers after deployment, because host settings may affect them. `dist/404.html` provides the custom missing-page content when the host supports it.

The earlier ChatGPT Sites deployment is separate and remains available; this Vercel configuration does not alter it.

## Limitations

Only public repositories are supported. GitHub may return the same 404 for a private or missing repository. Some repositories have no language or commit data. The language breakdown reflects byte totals, not code quality. The commit diagram shows the latest available entries in sequence and makes no claim about historical velocity.
