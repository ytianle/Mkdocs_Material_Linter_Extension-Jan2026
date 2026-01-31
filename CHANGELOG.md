# Change Log

All notable changes to this project will be documented in this file.

## [1.2.2] - 2026-01-30

- Fixed: Blank line before list logic to ensure parsing errors are always reported regardless of configuration.

## [1.2.1] - 2026-01-30

- Fixed: Configuration options were not being applied correctly due to a bug in settings retrieval.

## [1.2.0] - 2026-01-30

### Added
- Configuration options for flexible linting behavior:
  - `checkBlankLineBeforeList`: Control whether lists require preceding blank lines (default: false)
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
- False positive: Empty admonitions (title-only) no longer cause indentation errors on following unindented content
- False positive: Unindented bold/italic text after empty admonitions now correctly exempted
- Improved inline emphasis detection to handle more edge cases
- **Critical parsing error detection**: Paragraph followed directly by list now always reports an error (causes Markdown parsing failure) regardless of `checkBlankLineBeforeList` setting

### Changed
- Default value for `checkBlankLineBeforeAdmonitionContent` set to `false` for less strict behavior
- Default value for `checkBlankLineBeforeList` set to `false` to match common usage patterns
- Blank line before list logic now distinguishes between:
  - **Parsing errors** (always reported): Paragraph → List
  - **Style warnings** (configurable): Heading → List, Horizontal Rule → List, Code Block → List
  - **Automatic exemptions** (never reported): List → List, Blockquote → List, Table context, Admonition → List
- Improved pattern matching for bold text detection
- Error severity levels: Parsing errors use `Error`, style issues use `Warning`

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