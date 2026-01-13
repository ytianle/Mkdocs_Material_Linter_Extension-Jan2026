# Mkdocs Material Linter

Markdown lints for MkDocs Material in VS Code. It highlights common syntax mistakes and inconsistent patterns for MkDocs Material blocks.

## What it checks

- Admonition markers can be written with or without a space: `!!! note` or `!!!note`, `??? tip` or `???tip`, `???+ question` or `???+question`
- Admonition type is required after the marker
- Admonition type must be a simple identifier (letters, numbers, `_`, `-`)
- Unknown admonition types are flagged as warnings
- Admonition titles must have closed quotes if a quote is used
- Admonition content must be indented by 4 spaces or a tab (relative to the admonition line)
- Admonition content must start after a blank line unless the first content line is a list
- Tabs must be written as `=== "Title"` or `=== 'Title'`
- Tab titles must use matching quotes
- Tab content must be indented by 4 spaces or a tab (relative to the tab line)
- Table header must be followed by a separator row, and column counts must match
- Unordered list markers must be followed by a space
- Ordered list markers must be followed by a space
- Task list checkboxes must be followed by a space
- Lists in normal text should be preceded by a blank line

## Syntax highlighting

This extension ships a color theme named `MkDocs Material Linter`. Select it in
VS Code to see module-specific colors.

- Admonitions: orange
- Annotations: sky blue
- Buttons: green
- Code blocks (fence lines): slate
- Content tabs: violet
- Data tables: orange-red with light background
- Diagrams (mermaid fences): cyan
- Footnotes: purple
- Formatting (critic markup, highlights, keys): pink
- Grids: lime
- Icons & emojis: amber
- Images: emerald
- Lists: blue
- Math: red
- Tooltips: teal
- Front matter (`---` with YAML keys/values): teal
- Headings (`#` through `######`): bold blue
- Blockquotes (`>` lines): gray background
- Tables: light background (via editor decorations)
- Table headers: darker background + bold (via editor decorations)
- Tables: outer border + row separators (via editor decorations)
- Admonitions: type-specific narrow color bars with subtle background (nested blocks show multiple bars)
- Inline emphasis (`*italic*`, `**bold**`, `***bold italic***`): styled

## Examples

```md
!!! note "Title"
    This is valid.

???+ question "FAQ"
    This is valid.

=== "Tab A"
    Tab content.
```

```md
!!!note
Text not indented.

???+question
    Missing space after marker.

=== Tab A
    Missing quotes.

-item
1.item
- [x]Done
```

## Supported files

- Markdown (`.md`)
- MDX (`.mdx`)

## Editor shortcuts

- Toggle underline (MkDocs `^^underline^^`): `Ctrl+U` / `Cmd+U`
