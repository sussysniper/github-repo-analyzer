# Repository Atlas

**A modern, interactive GitHub repository analytics dashboard.**

Explore public GitHub repositories through a refined interface featuring repository statistics, programming-language visualizations, and recent commit activity.

Built with vanilla JavaScript, HTML, and CSS. Designed to be lightweight, responsive, accessible, and security-conscious.

**[Live Application](https://github-repo-analyzer-alpha.vercel.app/)** · **[Source Code](https://github.com/sussysniper/github-repo-analyzer)**

---

## Overview

Repository Atlas transforms publicly available GitHub repository information into a clean, interactive analytics experience.

Instead of navigating multiple GitHub pages, users can enter a repository URL and explore its key statistics, language composition, and recent development activity in one place.

The application combines an original cinematic-inspired design with a lightweight frontend architecture, meaningful data visualizations, and defensive handling of external API data.

## Features

### Repository Analytics

- Repository name and description
- Star and fork counts
- Open issues and pull requests count, as reported by GitHub
- Primary programming language
- Direct links to relevant GitHub resources

### Interactive Data Visualizations

- Programming-language distribution calculated from GitHub's reported language byte counts
- Visual representation of the five most recent commits
- Commit messages, authors, and timestamps
- Keyboard-accessible chart labels and supporting text
- Responsive visualizations for different screen sizes

The commit visualization represents the sequence of recent commits rather than a complete historical activity trend.

### User Experience

- Original charcoal-and-coral visual design
- Smooth transitions and purposeful animations
- Responsive layouts for desktop, tablet, and mobile
- Animated loading states and contextual feedback
- Helpful error messages and recovery states
- Keyboard navigation and visible focus indicators
- Reduced-motion support for accessibility

### Reliability

- Validation of repository URLs
- Handling of unavailable and empty repositories
- GitHub API rate-limit error handling
- Network timeout handling
- Prevention of stale search results overwriting newer requests
- Automated regression tests

---

## Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Semantic page structure |
| CSS3 | Responsive layouts, visual design, and animations |
| JavaScript (ES Modules) | Application logic and interactive rendering |
| GitHub REST API | Public repository data |
| Node.js | Automated testing |
| Vercel | Static hosting and deployment |

The application does not require a frontend framework, database, authentication system, or runtime package dependencies.

## How It Works

1. The user enters a public GitHub
