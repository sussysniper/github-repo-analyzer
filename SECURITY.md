# Security review

Reviewed against the relevant [OWASP DOM XSS guidance](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html) and [XSS prevention guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet).

## Threat model

The only user-controlled input is a public repository URL. GitHub API fields (names, descriptions, commit text, authors, language names, and URLs) are also untrusted. The application runs in a visitor's browser and has no privileged server, authentication, database, or token. Main risks are DOM XSS through API text or links, arbitrary network requests via malformed URLs, stale responses, rate-limit exhaustion, and leakage through third-party hosting or API requests.

## Controls

- URL parsing accepts only a canonical HTTPS `github.com/owner/repo` path and rejects credentials, ports, query strings, fragments, encoded paths, extra path segments, and unsafe schemes.
- API requests are assembled only under `https://api.github.com/repos/`, are sequential and bounded to three per analysis, reject redirects, and have a 15-second timeout.
- Displayed API text uses `textContent` or `createTextNode`; the app has no HTML injection sink, `eval`, or dynamic code execution.
- API-provided repository and commit links must be valid HTTPS `github.com` URLs with the expected path shape. External links use `rel="noopener noreferrer"`.
- The Vercel CSP permits same-origin scripts/styles and GitHub API connections only, without `unsafe-inline` or `unsafe-eval`. Headers also disable framing, MIME sniffing, and selected browser permissions.
- A request coordinator aborts superseded searches and ignores late responses.
- No runtime dependencies, account flow, analytics, cookies, or stored search history.

## Review and residual risk

Source and accessible Git history were scanned for common secret patterns; none were found in the reviewed revision. Automated tests cover malicious URLs and payloads, unsafe API links, malformed data, rate limits, empty repositories, network failures, and stale requests. This is a targeted review, not a guarantee against all vulnerabilities.

Unauthenticated GitHub API quotas are shared by source IP and can limit availability. Hosting and GitHub may retain operational request data. Availability also depends on both providers. Vercel headers and the custom 404 HTTP status must be checked on the actual deployed URL; repository configuration alone does not prove production behavior. Report suspected vulnerabilities through the repository owner via GitHub rather than posting exploit details publicly.
