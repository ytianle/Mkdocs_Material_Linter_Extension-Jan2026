# MkDocs Material Syntax Reference

> Based on https://iogogogo.github.io/markdown-with-mkdocs-material/syntax/main/
> Last Updated: 2026-01-30

## Table of Contents

1. [Syntax Overview](#syntax-overview)
2. [Admonitions](#admonitions)
3. [Content Tabs](#content-tabs)
4. [Code Blocks](#code-blocks)
5. [Text Formatting](#text-formatting)
6. [Lists](#lists)
7. [Tables](#tables)
8. [Links and Images](#links-and-images)
9. [Math Equations](#math-equations)
10. [Nested Syntax](#nested-syntax)
11. [Other Syntax](#other-syntax)
12. [Syntax Rules Summary](#syntax-rules-summary)
13. [Quick Reference Cards](#quick-reference-cards)
14. [Reference Links](#reference-links)

---

## 1. Syntax Overview

| Syntax | Function |
|--------|----------|
| `#` | Heading |
| Blank line | Paragraph |
| `>` | Blockquote |
| `[^sth]` | Footnote |
| `!!!` | Admonition |
| `???` | Collapsible admonition |
| `===` | Content tab |
| `\` | Escape |
| `*` / `+` / `-` | Unordered list |
| `1.` | Ordered list |
| `- [x]` / `- [ ]` | Task list |
| `---` | Horizontal rule |
| `:shortname:` | Emoji |
| `` ` `` | Inline code |
| ` ``` ` | Code block (with syntax highlighting) |
| `TAB` or 4 spaces | Code block (plain) |
| `#!` | Shebang in code block |
| `:::` | Code line highlighting marker |

---

## 2. Admonitions

### 2.1 Basic Syntax

```markdown
!!! note "Title"
    Content (indented by 4 spaces or 1 tab)
```

**Key Rules:**
- Must start with `!!!`
- Space required between type and title
- Content must be indented by 4 spaces or 1 tab
- Usually requires blank line before content (except for lists)

### 2.2 Admonition Types and Aliases

There are **12 admonition types** with various aliases:

| Type | Aliases | Color | Use Case |
|------|---------|-------|----------|
| `note` | `seealso` | Blue | Notes, references |
| `abstract` | `summary`, `tldr` | Light blue | Summaries, abstracts |
| `info` | `todo` | Cyan | Information, todos |
| `tip` | `hint`, `important` | Green | Tips, hints |
| `success` | `check`, `done` | Green | Success states |
| `question` | `help`, `faq` | Light green | Questions, FAQs |
| `warning` | `caution`, `attention` | Orange | Warnings |
| `failure` | `fail`, `missing` | Red | Failures, errors |
| `danger` | `error` | Red | Dangerous content |
| `bug` | None | Red | Bugs |
| `example` | None | Purple | Examples |
| `quote` | `cite` | Gray | Quotes, citations |

**Examples:**
```markdown
!!! note "This is a note"
    Note content

!!! warning "Caution"
    Warning content

!!! tip "Pro Tip"
    Tip content
```

### 2.3 Admonition Variants

#### 2.3.1 Empty Title
```markdown
!!! note ""
    Admonition with empty title
```

#### 2.3.2 No Title (inline style)
```markdown
!!! note
    Admonition without title
```

#### 2.3.3 Collapsible Admonitions

```markdown
??? note "Click to expand"
    Collapsible content
    
    Collapsed by default

???+ note "Expanded by default"
    Expanded collapsible admonition
```

**Key:**
- `???` - Collapsed by default
- `???+` - Expanded by default

### 2.4 Nested Admonitions

Admonitions can be nested by adding 4 additional spaces of indentation:

```markdown
!!! note "Outer admonition"
    Outer content
    
    !!! warning "Inner warning"
        Nested warning content
        
        Can nest multiple levels
```

---

## 3. Content Tabs

### 3.1 Basic Syntax

```markdown
=== "Tab 1"
    Tab 1 content (indented by 4 spaces)

=== "Tab 2"
    Tab 2 content

=== "Tab 3"
    Tab 3 content
```

**Key Rules:**
- Start with `===`
- **Space required** after `===`
- Title must be quoted (`"..."` or `'...'`)
- Content must be indented by 4 spaces or 1 tab
- Adjacent tabs automatically form a tab group

**Common Errors:**
```markdown
===Tab           # ❌ Missing space
=== Tab          # ❌ Missing quotes
===  "Tab"       # ❌ Extra space
```

### 3.2 Nested Tabs

```markdown
=== "Outer Tab 1"
    
    Outer content
    
    === "Inner Tab A"
        Inner content A
    
    === "Inner Tab B"
        Inner content B

=== "Outer Tab 2"
    Outer content 2
```

---

## 4. Code Blocks

### 4.1 Using Backticks (Recommended)

````markdown
```python
def hello():
    print("Hello World")
```
````

### 4.2 Using 4 Spaces or Tab Indentation

```markdown
    def hello():
        print("Hello World")
```

**Note:** If a code block follows a list, 4 spaces will be interpreted as list indentation, not a code block.

### 4.3 Code Highlighting Features

#### 4.3.1 Highlight Specific Lines
````markdown
```python hl_lines="2 3"
def hello():
    print("Line 2")  # Highlighted
    print("Line 3")  # Highlighted
    print("Line 4")
```
````

#### 4.3.2 Add Line Numbers
````markdown
```python linenums="1"
def hello():
    print("Hello World")
```
````

Start numbering from a specific line:
````markdown
```python linenums="10"
def hello():
    print("This is line 10")
```
````

#### 4.3.3 Add Code Title
````markdown
```python title="main.py"
def hello():
    print("Hello World")
```
````

#### 4.3.4 Combined Usage
````markdown
```python title="main.py" linenums="1" hl_lines="2 4"
def hello():
    name = "World"  # Highlighted
    greeting = f"Hello {name}"
    print(greeting)  # Highlighted
```
````

### 4.4 Shebang Highlighting

Use `#!` to mark special lines (typically shebangs):
````markdown
```python
#! /usr/bin/env python3
# Regular comment
print("Hello")
```
````

---

## 5. Text Formatting

### 5.1 Basic Formatting

| Syntax | Effect | Example |
|--------|--------|---------|
| `*text*` or `_text_` | *Italic* | *Italic text* |
| `**text**` or `__text__` | **Bold** | **Bold text** |
| `***text***` or `___text___` | ***Bold italic*** | ***Bold italic*** |
| `^^text^^` | <u>Underline</u> | ^^Underline^^ |
| `~~text~~` | ~~Strikethrough~~ | ~~Strikethrough~~ |
| `^text^` | Superscript | H^2^O |
| `~text~` | Subscript | H~2~O |

### 5.2 Advanced Formatting (with Background Colors)

| Syntax | Effect | Color |
|--------|--------|-------|
| `==text==` or `{==text==}` | Highlight | Yellow background |
| `{++text++}` | Insert | Green background + underline |
| `{--text--}` | Delete | Red background + strikethrough |
| `{~~old~>new~~}` | Replace | Red → Green |
| `{>>comment<<}` | Comment | Gray background |

**Examples:**
```markdown
This is ==highlighted text==

This is {++inserted content++}

This is {--deleted content--}

Replace {~~old text~>new text~~}

This is {>>a comment<<} in the text
```

---

## 6. Lists

### 6.1 Unordered Lists

Use `*`, `+`, or `-`:

```markdown
* Item 1
* Item 2
    * Sub-item 2.1
    * Sub-item 2.2
* Item 3
```

**Rules:**
- Space required after marker
- Sub-lists need 4-space indentation

### 6.2 Ordered Lists

```markdown
1. First item
2. Second item
    1. Sub-item 2.1
    2. Sub-item 2.2
3. Third item
```

**Rules:**
- Must have `.` and space after number
- Actual numbers don't matter (auto-numbered)

### 6.3 Task Lists

```markdown
- [ ] Incomplete task
- [x] Completed task
- [ ] Another task
```

**Rules:**
- `[ ]` - Unchecked
- `[x]` - Checked
- Space required after bracket

### 6.4 Multiple Paragraphs in Lists

```markdown
1. First item

    Second paragraph of first item (indented 4 spaces)
    
    Third paragraph of first item

2. Second item
```

---

## 7. Tables

### 7.1 Basic Syntax

```markdown
| Column 1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
| Content1 | Content2 | Content3 |
| Content4 | Content5 | Content6 |
```

### 7.2 Alignment

```markdown
| Left aligned | Center aligned | Right aligned |
| :----------- | :------------: | ------------: |
| Left         | Center         | Right         |
```

**Alignment Rules:**
- `:---` - Left aligned (default)
- `:---:` - Center aligned
- `---:` - Right aligned

### 7.3 Table Rules

1. **Must have header separator row**
2. **Column count must match** (header, separator, data rows)
3. Leading and trailing `|` can be omitted

**Simplified Syntax:**
```markdown
Column 1 | Column 2 | Column 3
-------- | -------- | --------
Content1 | Content2 | Content3
```

---

## 8. Links and Images

### 8.1 Links

#### 8.1.1 Inline Links
```markdown
[Link text](https://example.com "Optional title")
```

#### 8.1.2 Reference Links
```markdown
[Link text][ref]

At document end:
[ref]: https://example.com "Optional title"
```

#### 8.1.3 Automatic Links
```markdown
<https://example.com>
<email@example.com>
```

#### 8.1.4 Anchor Links
```markdown
[Jump to heading](#heading-id)
```

### 8.2 Images

#### 8.2.1 Inline Style
```markdown
![Alt text](image-url "Optional title")
```

#### 8.2.2 Reference Style
```markdown
![Alt text][imgref]

[imgref]: image-url "Optional title"
```

#### 8.2.3 Linked Images
```markdown
[![Image alt](image-url)](link-url)
```

---

## 9. Math Equations

### 9.1 Inline Math

```markdown
This is inline math $E = mc^2$ in text

Or use \(E = mc^2\)
```

### 9.2 Block Math

```markdown
$$
E = mc^2
$$

Or use:

\begin{equation}
E = mc^2
\end{equation}
```

**Rules:**
- `$$` must be on separate lines
- Formula content can span multiple lines
- Supports LaTeX syntax

---

## 10. Nested Syntax

### 10.1 Code Block in Admonition

````markdown
!!! note "Code Example"
    
    Here's the code:
    
    ```python
    def hello():
        print("Hello")
    ```
````

### 10.2 Code Block in List

````markdown
- List item

    ```python
    # Code block (indented 4 spaces)
    print("hello")
    ```

- Next list item
````

### 10.3 Code Block in Blockquote

````markdown
> Quote content
> 
> ```python
> print("hello")
> ```
````

### 10.4 Nested Admonitions

```markdown
!!! note "Outer"
    Outer content
    
    !!! warning "Inner"
        Inner content
```

### 10.5 Nested Lists

```markdown
- Outer item
    - Inner item 1
    - Inner item 2
        - Deeper item
- Outer item 2
```

### 10.6 Complex Nesting

```markdown
!!! note "Admonition title"
    
    1. List item 1
    
        ```python
        # Code block
        print("hello")
        ```
    
    2. List item 2
        
        > Quote content
        > 
        > Multi-line quote
```

---

## 11. Other Syntax

### 11.1 Footnotes

```markdown
Reference in text[^1] and another reference[^note]

[^1]: This is the first footnote
[^note]: This is a named footnote
```

### 11.2 Emoji

```markdown
:smile: :heart: :rocket: :thumbsup:
```

Common emoji shortcodes:
- `:smile:` 😄
- `:heart:` ❤️
- `:rocket:` 🚀
- `:+1:` or `:thumbsup:` 👍
- `:warning:` ⚠️
- `:bulb:` 💡

### 11.3 Horizontal Rules

```markdown
---

or

***

or

___
```

**Rule:** At least 3 characters

### 11.4 Escape Characters

Characters that need escaping:

```markdown
\ ` * _ { } [ ] ( ) # + - . ! |
```

Use backslash to escape:

```markdown
\* Not a list item
\# Not a heading
\[Not a link\]
```

### 11.5 Front Matter

Add metadata at document start:

```yaml
---
title: Page Title
description: Page Description
author: Author Name
date: 2026-01-30
---
```

---

## 12. Syntax Rules Summary

### 12.1 Indentation Rules

| Syntax | Indentation | Relative To |
|--------|-------------|-------------|
| Admonition content | 4 spaces or 1 tab | Relative to `!!!` |
| Tab content | 4 spaces or 1 tab | Relative to `===` |
| List sub-items | 4 spaces or 1 tab | Relative to parent marker |
| Code block (in list) | 4 spaces | Relative to list item |
| Nested admonition | Additional 4 spaces | Relative to outer content |

### 12.2 Blank Line Requirements

| Scenario | Blank Line Needed? | Example |
|----------|-------------------|---------|
| Before admonition content | Usually (except lists) | `!!! note\n\n    content` |
| Between paragraphs | Yes | `Paragraph 1\n\nParagraph 2` |
| Between list items | Optional | Compact or loose lists |
| Around code blocks | Yes | Avoid parsing errors |
| Around headings | Recommended | Improves readability |

### 12.3 Common Errors

#### 12.3.1 Admonition Syntax Errors

```markdown
# ❌ Wrong
!!! note        # Missing title or quotes
!!!note "Title" # Missing space
!!! note "Title"
Content         # Content not indented

# ✅ Correct
!!! note "Title"

    Content (indented 4 spaces)
```

#### 12.3.2 Tab Syntax Errors

```markdown
# ❌ Wrong
===Tab          # Missing space and quotes
=== Tab         # Missing quotes
=== "Tab"
Content         # Content not indented

# ✅ Correct
=== "Tab"

    Content (indented 4 spaces)
```

#### 12.3.3 Table Errors

```markdown
# ❌ Wrong
| A | B |
| Content |    # Column mismatch

| A | B
| --- | ---   # Missing header |

# ✅ Correct
| A | B |
| --- | --- |
| Content1 | Content2 |
```

#### 12.3.4 Code Block Errors

````markdown
# ❌ Wrong
```python       # Not closed
code

# ✅ Correct
```python
code
```
````

#### 12.3.5 Math Equation Errors

```markdown
# ❌ Wrong
$$E = mc^2     # Not closed

# ✅ Correct
$$
E = mc^2
$$
```

### 12.4 Syntax Priority

When multiple syntaxes conflict, priority order:

1. **Code blocks** - Highest priority, content not parsed
2. **Inline code** - Content not parsed
3. **Escape characters** - `\` makes character literal
4. **Admonitions/Tabs** - Block-level elements
5. **Lists** - Block-level elements
6. **Text formatting** - Inline elements
7. **Links** - Inline elements

**Examples:**
```markdown
`**Not bold**`              # Code priority, shows as plain text
\*\*Not bold\*\*            # Escape priority, shows **Not bold**
**This is bold**            # Normal parsing as bold
```

---

## 13. Quick Reference Cards

### Admonition Quick Reference

```markdown
!!! note "Note"              # Blue
!!! tip "Tip"                # Green  
!!! warning "Warning"        # Orange
!!! danger "Danger"          # Red
??? note "Collapsed"         # Collapsed by default
???+ note "Expanded"         # Expanded by default
```

### Tab Quick Reference

```markdown
=== "Tab 1"
    Content 1

=== "Tab 2"
    Content 2
```

### Code Quick Reference

````markdown
```python title="filename" linenums="1" hl_lines="2 3"
Line 1
Line 2  # Highlighted
Line 3  # Highlighted
```
````

### Text Format Quick Reference

```markdown
*Italic*  **Bold**  ***Bold italic***
^^Underline^^  ~~Strikethrough~~
^Superscript^  ~Subscript~
==Highlight==  {++Insert++}  {--Delete--}
```

---

## 14. Reference Links

- **Full Documentation:** https://iogogogo.github.io/markdown-with-mkdocs-material/
- **Admonitions:** https://iogogogo.github.io/markdown-with-mkdocs-material/syntax/note_main/
- **Code Blocks:** https://iogogogo.github.io/markdown-with-mkdocs-material/syntax/code_block/
- **Nested Syntax:** https://iogogogo.github.io/markdown-with-mkdocs-material/syntax/nest_main/
- **Official Docs:** https://squidfunk.github.io/mkdocs-material/

---