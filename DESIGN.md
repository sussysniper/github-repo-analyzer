# Repository Atlas design system

## Product

Repository Atlas gives developers a fast, trustworthy reading of a public GitHub repository. The primary journey is URL entry → loading feedback → clear repository metrics, language composition, and the most recent commits. No account or invented analytics.

## Direction

Editorial, cinematic, and restrained. A near-black canvas, warm coral signal color, large typographic opening, and compact analytical detail. The interface is original and does not reproduce any inspiration's marks, layouts, or proprietary assets.

## Tokens and hierarchy

`dist/style.css` is canonical. `--bg`, `--surface`, and `--surface-raised` define the three dark levels. `--text`, `--muted`, and `--quiet` define the reading hierarchy. `--accent` is reserved for the brand, chart signal, and primary action; `--error` and `--success` are semantic. Borders use `--line`; panels use `--radius` (10px). Spacing follows an 8px rhythm with 4px adjustments. The hero uses a tuned sans-serif display with a Georgia serif accent; data labels use monospace only where they serve scanning.

## Components and motion

The header is a single unobtrusive navigation row. The search panel is the primary action. Metrics share a ruled strip rather than four decorative cards. Two balanced panels hold real language and commit data, with text equivalents for both charts. Motion is brief and purposeful: entrance, loading skeleton, one count-up on new data, and chart arrival. Reduced-motion preferences replace movement with a short fade.

## Accessibility and content

One `h1` per page, visible focus, semantic sections, 16px input text, explanatory status messages, and keyboard-readable chart points. Missing data uses explicit empty copy or an em dash. No fake values, claims, testimonials, or speculative trend charts.
