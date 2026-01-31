# Test: Check Blank Line Before List

## Test 1: Paragraph before list (should ALWAYS error - parsing issue)
Some paragraph text
- list item

**Expected**: ❌ Error "List after paragraph requires a blank line (parsing error)."

---

## Test 2: Paragraph before list with blank line (should be OK)
Some paragraph text

- list item

**Expected**: ✅ No errors

---

## Test 3: Heading before list (default: false = no error)
### Heading
- list item

**Expected**: ✅ No errors (with default config: checkBlankLineBeforeList: false)

---

## Test 4: Horizontal rule before list (default: false = no error)
---
- list item

**Expected**: ✅ No errors (with default config: checkBlankLineBeforeList: false)

---

## Test 5: Code fence before list (default: false = no error)
```python
code
```
- list item

**Expected**: ✅ No errors (with default config: checkBlankLineBeforeList: false)

---

## Test 6: List after list (should NEVER error)
- First item
- Second item

**Expected**: ✅ No errors (automatic exemption)

---

## Test 7: List after blockquote (should NEVER error)
> Quote text
- list item

**Expected**: ✅ No errors (automatic exemption)

---

## Test 8: List in table (should NEVER error)
| Column |
|--------|
| - item |

**Expected**: ✅ No errors (automatic exemption)

---

## Test 9: List after admonition header (should NEVER error)
!!! note
    - list item

**Expected**: ✅ No errors (automatic exemption)

---

## Configuration Test
To test with `checkBlankLineBeforeList: true`, add to settings.json:
```json
{
  "mkdocs-material-linter.checkBlankLineBeforeList": true
}
```

Then tests 3, 4, 5 should show ⚠️ Warning "List items should be preceded by a blank line."
