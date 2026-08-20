# AGENTS.md — n8n-nodes-crawl-and-scrape

## What This Is

An **n8n community node** that wraps [Crawlee](https://github.com/apify/crawlee) (v3) to crawl and scrape websites from n8n workflows. Published as `n8n-nodes-crawl-and-scrape` on npm.

## Directory Layout

- `nodes/CrawleeNode/CrawleeNode.node.ts` — the single node implementation (all logic lives here)
- `nodes/CrawleeNode/crawl-and-scrape-logo.svg` — node icon
- `types/custom.d.ts` — cheerio module type declarations
- `storage/` — local Crawlee key-value store and request queue files (runtime artifacts, do not edit)
- `dist/` — compiled output (generated, do not edit)
- `gulpfile.js` — copies icons to `dist/` during build
- `index.js` — empty entry point

## Commands

| Action | Command |
|---|---|
| Install | `pnpm install` |
| Build | `pnpm build` (cleans `dist/`, runs `tsc`, copies icons via gulp) |
| Dev (watch) | `pnpm dev` |
| Lint | `pnpm lint` |
| Lint + fix | `pnpm lintfix` |
| Format | `pnpm format` (prettier on `nodes/`) |
| Test | `pnpm test` (vitest) |
| Local test in n8n | `pnpm test:local` (links package into `~/.n8n/custom`) |

Package manager is **pnpm** (>= 9.1, enforced via `preinstall` script). Node >= 18.10 required.

## Architecture

**Single-file node.** All crawling logic, header parsing, cookie handling, and operation routing is in `CrawleeNode.node.ts`. The node class implements `INodeType` from `n8n-workflow`.

### Crawlers Used

- **CheerioCrawler** (default) — fast, no browser, good for static pages
- **PlaywrightCrawler** — toggle via "Use Browser (Playwright)" parameter, for JS-rendered sites

### Operations

1. `extractLinks` — crawls with max depth, returns deduplicated links
2. `extractText` — extracts `body.innerText` + title + meta description
3. `extractHtml` — returns raw HTML + title + meta description
4. `extractMarkdown` — converts HTML to markdown via turndown (respects Use Browser toggle). Returns `url`, `title`, `description`, `markdown`
5. `extractMarkdownScreenshot` — always forces Playwright, returns markdown + full-page PNG screenshot as n8n binary data. The `useBrowser` toggle is hidden for this operation

### Header / Cookie Processing

Headers and cookies can be provided as JSON or raw strings. The `processHeaders()` function inside `execute()` merges cookies from headers into the cookie object and strips `accept-encoding`. Playwright mode also syncs the User-Agent header with `navigator.userAgent` and sets a 1920x1080 viewport for stealth.

## Coding Conventions

- **TypeScript** with strict mode (`strictNullChecks`, `noImplicitAny`, `noImplicitReturns`, `noUnusedLocals`)
- Target: ES2019, CommonJS modules
- Imports use `n8n-workflow` types (`IExecuteFunctions`, `INodeExecutionData`, `INodeType`, etc.)
- `n8n-workflow` is a peer dependency — never bundle it
- Crawlee (`cheerio`, `crawlee`, `playwright`) are runtime dependencies
- Icons must be `.png` or `.svg` and live alongside the `.node.ts` file

## Gotchas

- **No credentials.** This node requires zero n8n credentials.
- **`accept-encoding` is always stripped** from custom headers to let the HTTP client handle decompression. This is intentional.
- **Cookie header extraction**: if a `Cookie` key exists in custom headers, those cookies are parsed out and merged into the cookie parameter, then the header is removed. Both paths feed into the crawler's cookie handling.
- **Anti-bot stealth** is baked into PlaywrightCrawler: `--disable-blink-features=AutomationControlled`, `navigator.webdriver = false`, real viewport, and UA sync. Changes here affect all operations.
- **Timestamp appended to URLs**: `appendTimestampToUrl()` adds `?_=<timestamp>` to bust caches. All crawler `.run()` calls go through it.
- The `storage/` directory contains Crawlee's local state (key-value stores, request queues). It is not source code — ignore it during reviews.
- `eslint-plugin-n8n-nodes-base` enforces n8n-specific lint rules. Run `pnpm lint` before committing.
- Tests use Vitest (`pnpm test`). Helper functions are unit-tested in `test/helpers.test.ts`. Tests live in `test/` and are excluded from the build output.
- `extractMarkdownScreenshot` captures `this.helpers.prepareBinaryData` via `executeContext` before entering the Playwright crawler callback, since `this` inside `requestHandler` refers to the crawler options, not the n8n execution context.
