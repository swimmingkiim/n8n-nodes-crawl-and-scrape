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


## [0.3.0] - 2025-12-17

### Added
- **Flexible Header Input**: Added "Raw String" option for "Custom Headers". Users can now paste raw request headers (e.g. `User-Agent: ...\nCookie: ...`) directly from browser devtools.
- **Smart Header Parsing**: Automatically extracts `Cookie` from custom headers and applies them correctly to the browser session.
- **Stealth Improvements**:
    - **User-Agent Sync**: Automatically patches `navigator.userAgent` to match the User-Agent header, preventing mismatch detection.
    - **Viewport**: Sets a realistic desktop viewport (1920x1080) for browser crawling.
    - **Wait Strategy**: Updated `extractText` and `extractHtml` to use `networkidle` to ensure dynamic content loads fully.

### Fixed
- Fixed an issue where `extractText` and `extractHtml` would return raw JavaScript/anti-bot scripts instead of page content by improving the wait strategy.
- Fixed an issue where AliExpress and other protected sites would show only footer content by implementing the User-Agent sync and header parsing logic.

