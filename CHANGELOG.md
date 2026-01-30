# Change Log

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-01-30

### Added
- Configuration options for flexible linting behavior:
  - `checkBlankLineBeforeList`: Control whether lists require preceding blank lines (default: true)
  - `checkBlankLineBeforeAdmonitionContent`: Control whether admonition content requires a blank line before it (default: false)
  - `checkIndentation`: Control whether to check indentation for admonitions and tabs (default: true)
- Support for Markdown abbreviation syntax (`*[ABBR]: definition`)
- Support for PyMdown Extensions Snippet syntax (`--8<-- "file.md"`)
- 18 new test cases covering false positive fixes and configuration options
- Added tests with dependencies for the whole extension using VS Code Test Runner

### Fixed
- False positive: Bold text (e.g., `**file/path_name.py**`) no longer incorrectly flagged as list item error
- False positive: Abbreviation definitions no longer flagged as list item errors
- False positive: Snippet includes no longer flagged as list item errors
- Improved inline emphasis detection to handle more edge cases

### Changed
- Default value for `checkBlankLineBeforeAdmonitionContent` set to `false` to match common usage patterns
- Improved pattern matching for bold text detection

## [1.1.2] - 2026-01-18

- Added Change Log.

## [1.1.1] - 2026-01-18

- Fixed math highlighting/diagnostics leaking into fenced code blocks (e.g., `$` in ```bash).

## [1.1.0] - 2026-01-13

- Added demo assets/content.
- Tuned admonition highlighting.

## [1.0.0] - 2026-01-11

- Added core MkDocs Material syntax highlighting.
- Added diagnostics for common MkDocs Material mistakes (admonitions, tabs, tables, lists, code fences, math blocks).
- Added light and dark themes for best rendering.

## [0.0.1] - 2026-01-11

- Project initialized.