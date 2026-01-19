---
title: MkDocs Material Linter Demo
icon: material/check
---

# MkDocs Material Linter Demo

> A quick page that covers the main structures this linter checks and highlights.

> ???+Question
    - How does Git help us do version control?
    - What is `commit` essentially?
    - What is `branch` essentially?
    - What is `diff` essentially?
    - Does `committing` equal `patching`?
    - What is `rebase` essentially?

> How to compile vs code extension?
> 1. npm install
> 2. npm run compile
> 3. F5 to launch extension host
> 4. Open markdown file to see highlights

## Admonitions

!!! note "Plain note"
    
    This is a simple admonition.

???+ warning "Nested example"
    - List item 1
    - List item 2

    ???+ tip "Inner tip"
        
        Nested content with *italic*, **bold**, ***bold italic***, and ^^underline^^.

        ??? example "Code block example"
            
            print("Hello, World!") # Python code

??? info "Collapsible example"
    
    This content is hidden by default.

!!! example "Expanded example"
    
    This content is shown by default.

??? success "Custom title example"
    
    This is a success admonition with a custom title.

??? failure "Another custom title"
    
    This is a failure admonition with a custom title.

## Content tabs

=== "Tab A"

    Tab content line.

    === "Subtab A1"
    
        Subtab content.

        ```Bash
        eval $(ssh-agent -s)
        ssh-add ~/.ssh/id_rsa
        ```     

    === "Subtab A2"
        Another subtab content.

=== "Tab B"
    Another tab.

## Lists

Paragraph text before list.

- Unordered item
- Unordered item

1. Ordered item
2. Ordered item

- [x] Task done
- [ ] Task todo

Term
:   Definition text.

## Tables

| Column | Value |
| --- | --- |
| One | :material-check: |
| Two | :material-close: |

## Code blocks

```c++
#include <iostream>
int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
```

~~~json
{"ok": true}
~~~

## Math

$$
E = mc^2
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
f(x) = \int_{-\infty}^{\infty} e^{-t^2} dt
$$

Inline math: $a^2 + b^2 = c^2$

## Footnotes and tooltips

Here is a footnote reference.[^1]

[Hover me](https://example.com "Tooltip text")

[API]: Application Programming Interface

[^1]: Footnote content.

## Icons, emojis, images

:material-star: :smile:

![demo image](images/demo.png){width="50%", : .center}


# 1. Headings
## 2. Headings
### 3. Headings
#### 4. Headings
##### 5. Headings
###### 6. Headings
####### 7. Headings