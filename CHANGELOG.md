# Changelog

## [0.1.0]

- Initial release
- Added support for basic web scraping operations:
  - Extract Links
  - Extract Text
  - Extract HTML

## [0.1.2]

- Add proxy feature
- Update crawlee version

## [0.2.0] - 2025-12-17

### Added
- **Browser-based Crawling**: Added support for `PlaywrightCrawler` (via "Use Browser (Playwright)" toggle) to handle client-side rendered websites like AliExpress.
- **Custom Headers**: Added "Custom Headers" input (JSON) to inject headers into requests.
- **Cookie Support**: Added support for custom cookies.
    - **JSON Input**: Provide cookies as a JSON object.
    - **Raw String Input**: Paste raw cookie strings directly (e.g., `key=value; key2=value2`).
- **Input Toggle**: Added "Cookies Input Type" to switch between JSON and Raw String modes.


