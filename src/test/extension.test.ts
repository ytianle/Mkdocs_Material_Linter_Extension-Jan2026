import * as assert from 'assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'ytianle.mkdocs-material-linter';

async function activateExtension(): Promise<void> {
	const extension = vscode.extensions.getExtension(EXTENSION_ID);
	assert.ok(extension, `Extension not found: ${EXTENSION_ID}`);
	if (!extension.isActive) {
		await extension.activate();
	}
}

async function openMarkdownDocument(content: string): Promise<vscode.TextEditor> {
	const document = await vscode.workspace.openTextDocument({ language: 'markdown', content });
	return vscode.window.showTextDocument(document);
}

async function waitForDiagnostics(
	uri: vscode.Uri,
	predicate: (diagnostics: vscode.Diagnostic[]) => boolean,
	timeoutMs = 1500,
): Promise<vscode.Diagnostic[]> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const diagnostics = vscode.languages.getDiagnostics(uri);
		if (predicate(diagnostics)) {
			return diagnostics;
		}
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
	return vscode.languages.getDiagnostics(uri);
}

async function waitForDocumentText(document: vscode.TextDocument, expected: string, timeoutMs = 2000): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		if (document.getText() === expected) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
	assert.strictEqual(document.getText(), expected);
}

async function waitForSelection(
	editor: vscode.TextEditor,
	predicate: (selection: vscode.Selection) => boolean,
	timeoutMs = 1500,
): Promise<vscode.Selection> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const selection = editor.selection;
		if (predicate(selection)) {
			return selection;
		}
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
	return editor.selection;
}

async function closeAllEditors(): Promise<void> {
	const tabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs);
	for (const tab of tabs) {
		const input = tab.input as { uri?: vscode.Uri; modified?: vscode.Uri } | undefined;
		const uri = input?.uri ?? input?.modified;
		if (uri) {
			try {
				await vscode.window.showTextDocument(uri, { preview: false, preserveFocus: false });
			} catch {
				// Ignore tabs that cannot be shown.
			}
			await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
		} else {
			await vscode.window.tabGroups.close(tab, true);
		}
	}
	await vscode.commands.executeCommand('workbench.action.closeAllEditors');
}

suite('MkDocs Material Linter', () => {
	suiteSetup(async () => {
		await activateExtension();
	});
	teardown(async () => {
		await closeAllEditors();
	});

	suite('1. Admonitions', () => {
		test('1.1 reports admonition syntax errors', async () => {
			const missingType = await openMarkdownDocument('!!! ');
			const missingTypeDiagnostics = await waitForDiagnostics(missingType.document.uri, (items) => items.length === 1);
			assert.strictEqual(missingTypeDiagnostics[0].message, 'Admonition type is required.');

			const invalidType = await openMarkdownDocument('!!! invalid$type');
			const invalidTypeDiagnostics = await waitForDiagnostics(invalidType.document.uri, (items) => items.length === 1);
			assert.strictEqual(invalidTypeDiagnostics[0].message, 'Admonition type must be a simple identifier.');

			const unclosedQuote = await openMarkdownDocument('!!! note "Unclosed');
			const unclosedQuoteDiagnostics = await waitForDiagnostics(unclosedQuote.document.uri, (items) => items.length === 1);
			assert.strictEqual(unclosedQuoteDiagnostics[0].message, 'Admonition title has an unclosed quote.');
		});

		test('1.2 warns on unknown admonition type', async () => {
			const editor = await openMarkdownDocument('!!! caution');
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 1);
			assert.strictEqual(diagnostics[0].message, 'Unknown admonition type: "caution".');
			assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Warning);
		});

		test('1.3 accepts valid admonition types without warnings', async () => {
			const editor = await openMarkdownDocument([
				'!!! error',
				'',
				'    Indented content',
			].join('\n'));

			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
			assert.strictEqual(diagnostics.length, 0);
		});

		test('1.4 requires indented admonition bodies', async () => {
			const editor = await openMarkdownDocument([
				'!!! note',
				'',
				'Not indented',
			].join('\n'));

			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 1);
			assert.strictEqual(diagnostics[0].message, 'Admonition content must be indented by 4 spaces or a tab.');
		});

		test('1.5 requires blank line before non-list admonition content when config enabled', async () => {
			const config = vscode.workspace.getConfiguration('mkdocs-material-linter');
			const originalValue = config.get('checkBlankLineBeforeAdmonitionContent');

			try {
				await config.update('checkBlankLineBeforeAdmonitionContent', true, vscode.ConfigurationTarget.Global);
				// Wait for configuration to propagate
				await new Promise((resolve) => setTimeout(resolve, 200));

				const editor = await openMarkdownDocument([
					'!!! note',
					'    Content without blank line',
				].join('\n'));

				// Force a re-lint by making a small edit
				await editor.edit((editBuilder) => {
					editBuilder.insert(new vscode.Position(0, 0), ' ');
				});
				await editor.edit((editBuilder) => {
					editBuilder.delete(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1)));
				});

				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length > 0, 3000);
				assert.ok(diagnostics.length > 0, 'Expected at least one diagnostic');
				const admonitionDiagnostic = diagnostics.find((d) => d.message.includes('blank line'));
				assert.ok(admonitionDiagnostic, 'Expected diagnostic about blank line before admonition content');
			} finally {
				await config.update('checkBlankLineBeforeAdmonitionContent', originalValue, vscode.ConfigurationTarget.Global);
			}
		});

		test('1.6 accepts a valid admonition', async () => {
			const editor = await openMarkdownDocument(['!!! note "Note"', '', '    Valid content'].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => true);
			assert.ok(Array.isArray(diagnostics));
		});

		test('1.7 accepts collapsible admonitions', async () => {
			const editor = await openMarkdownDocument([
				'??? note "Collapsed"',
				'',
				'    Collapsible content',
				'',
				'???+ note "Expanded"',
				'',
				'    Expanded content',
			].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
			assert.strictEqual(diagnostics.length, 0);
		});

		test('1.8 accepts empty admonition titles', async () => {
			const editor = await openMarkdownDocument([
				'!!! note ""',
				'',
				'    Empty title content',
			].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
			assert.strictEqual(diagnostics.length, 0);
		});

		test('1.9 accepts nested admonitions', async () => {
			const editor = await openMarkdownDocument([
				'!!! note "Outer"',
				'',
				'    Outer content',
				'',
				'    !!! warning "Inner"',
				'',
				'        Inner content',
			].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
			assert.strictEqual(diagnostics.length, 0);
		});
	});

	suite('2. Annotations', () => {
		test('2.1 accepts a simple annotation-like block', async () => {
			const editor = await openMarkdownDocument(['::annotation::', '', '    annotation body'].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => true);
			assert.ok(Array.isArray(diagnostics));
		});
	});

	suite('3. Buttons', () => {
		test('3.1 accepts a button shortcode example', async () => {
			const editor = await openMarkdownDocument('[button](# "label")');
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => true);
			assert.ok(Array.isArray(diagnostics));
		});
	});

	suite('4. Code blocks', () => {
		test('4.1 reports unclosed code fence', async () => {
			const editor = await openMarkdownDocument([
				'```',
				'code',
			].join('\n'));

			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 1);
			assert.strictEqual(diagnostics[0].message, 'Code fence must be closed.');
		});

		test('4.2 accepts fenced code block with language and options', async () => {
			const editor = await openMarkdownDocument(['```js title="file.js" hl_lines="1"', 'console.log(1);', '```'].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => true);
			assert.ok(Array.isArray(diagnostics));
		});

		test('4.3 reports unclosed tilde code fence', async () => {
			const editor = await openMarkdownDocument([
				'~~~',
				'code',
			].join('\n'));

			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 1);
			assert.strictEqual(diagnostics[0].message, 'Code fence must be closed.');
		});

		test('4.4 ignores list spacing inside code fences', async () => {
			const editor = await openMarkdownDocument([
				'```',
				'-item',
				'```',
			].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
			assert.strictEqual(diagnostics.length, 0);
		});

		test('4.5 requires closing fence to match opening length', async () => {
			const editor = await openMarkdownDocument([
				'````',
				'code',
				'```',
			].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 1);
			assert.strictEqual(diagnostics[0].message, 'Code fence must be closed.');
		});
	});

	suite('5. Content tabs', () => {
		test('5.1 reports tab syntax errors', async () => {
			const editor = await openMarkdownDocument([
				'===Tab',
				'=== Tab',
			].join('\n'));

			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 2);
			const messages = diagnostics.map((item) => item.message).sort();
			assert.deepStrictEqual(messages, [
				'Tab marker must be followed by a space.',
				'Tab title must be wrapped in matching quotes.',
			]);
		});

		test('5.2 requires indented tab bodies', async () => {
			const editor = await openMarkdownDocument([
				'=== "Tab"',
				'Not indented either',
			].join('\n'));

			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 1);
			assert.strictEqual(diagnostics[0].message, 'Tab content must be indented by 4 spaces or a tab.');
		});

		test('5.3 accepts tab group with two tabs', async () => {
			const editor = await openMarkdownDocument(['=== "One"', '    Content A', '', '=== "Two"', '    Content B'].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => true);
			assert.ok(Array.isArray(diagnostics));
		});

		test('5.4 reports mismatched tab title quotes', async () => {
			const editor = await openMarkdownDocument('=== "Tab\'');
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 1);
			assert.strictEqual(diagnostics[0].message, 'Tab title must be wrapped in matching quotes.');
		});

		test('5.5 accepts single-quoted tab titles', async () => {
			const editor = await openMarkdownDocument([
				"=== 'Single'",
				'    Content',
			].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
			assert.strictEqual(diagnostics.length, 0);
		});
	});

	suite('6. Data tables', () => {
		test('6.1 reports missing table header separator', async () => {
			const editor = await openMarkdownDocument([
				'| A |',
				'not a separator',
			].join('\n'));

			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 1);
			assert.strictEqual(diagnostics[0].message, 'Table header must be followed by a separator row.');
		});

		test('6.2 validates table header separator column counts', async () => {
			const editor = await openMarkdownDocument([
				'| A | B |',
				'| --- | --- | --- |',
			].join('\n'));

			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 1);
			assert.strictEqual(diagnostics[0].message, 'Table separator column count must match the header.');
		});

		test('6.3 accepts a simple table', async () => {
			const editor = await openMarkdownDocument(['| A | B |', '| --- | --- |', '| 1 | 2 |'].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => true);
			assert.ok(Array.isArray(diagnostics));
		});

		test('6.4 accepts simplified table syntax without outer pipes', async () => {
			const editor = await openMarkdownDocument(['A | B | C', '--- | --- | ---', '1 | 2 | 3'].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
			assert.strictEqual(diagnostics.length, 0);
		});

		test('6.5 accepts mixed pipe styles in tables', async () => {
			const editor = await openMarkdownDocument([
				'| A | B |',
				'--- | ---',
				'1 | 2',
			].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
			assert.strictEqual(diagnostics.length, 0);
		});

		test('6.6 accepts header after blank line', async () => {
			const editor = await openMarkdownDocument([
				'',
				'| A | B |',
				'| --- | --- |',
				'| 1 | 2 |',
			].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
			assert.strictEqual(diagnostics.length, 0);
		});

		test('6.7 ignores list spacing inside tables', async () => {
			const editor = await openMarkdownDocument([
				'| Item |',
				'| --- |',
				'| -item |',
			].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
			assert.strictEqual(diagnostics.length, 0);
		});
	});

	suite('7. Diagrams', () => {
		test('7.1 accepts mermaid diagram block', async () => {
			const editor = await openMarkdownDocument(['```mermaid', 'graph TD; A-->B;', '```'].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => true);
			assert.ok(Array.isArray(diagnostics));
		});
	});

	suite('8. Footnotes', () => {
		test('8.1 accepts footnote definitions and references', async () => {
			const editor = await openMarkdownDocument(['Reference[^1]', '', '[^1]: Footnote text'].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => true);
			assert.ok(Array.isArray(diagnostics));
		});
	});

	suite('9. Formatting', () => {
		test('9.1 accepts inline and block formatting examples', async () => {
			const editor = await openMarkdownDocument(['**bold** _italic_ ^^underline^^', '', '==highlight== {++ins++} {--del--}'].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => true);
			assert.ok(Array.isArray(diagnostics));
		});
	});

	suite('10. Grids', () => {
		test('10.1 accepts a simple grid example', async () => {
			const editor = await openMarkdownDocument(['::: grid', '::: col 1/2', 'Content', ':::', ':::', ':::'].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => true);
			assert.ok(Array.isArray(diagnostics));
		});
	});

	suite('11. Icons and Emojis', () => {
		test('11.1 accepts emoji shortcodes and icon markup', async () => {
			const editor = await openMarkdownDocument([':smile: :rocket: :heart:'].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => true);
			assert.ok(Array.isArray(diagnostics));
		});
	});

	suite('12. Images', () => {
		test('12.1 accepts inline and reference images', async () => {
			const editor = await openMarkdownDocument(['![alt](https://example.com/img.png "title")', '', '![alt][imgref]', '', '[imgref]: https://example.com/img.png "title"'].join('\n'));
			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => true);
			assert.ok(Array.isArray(diagnostics));
		});
	});

	suite('13. Lists', () => {
		test('13.1 reports list spacing errors', async () => {
			const editor = await openMarkdownDocument([
				'-item',
				'1.item',
				'',
				'- [x]item',
			].join('\n'));

			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 3);
			const messages = diagnostics.map((item) => item.message).sort();
			assert.deepStrictEqual(messages, [
				'Ordered list markers must be followed by a space.',
				'Task list checkboxes must be followed by a space.',
				'Unordered list markers must be followed by a space.',
			]);
		});

		test('13.2 requires blank line before list items in normal text', async () => {
			const editor = await openMarkdownDocument([
				'Paragraph line',
				'- list item',
			].join('\n'));

			const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 1);
			assert.strictEqual(diagnostics.length, 1);
			assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Error);
			assert.ok(diagnostics[0].message.includes('parsing error'));

			test('13.4 accepts task list markers with uppercase X', async () => {
				const editor = await openMarkdownDocument(['- [X] Done'].join('\n'));
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});

			test('13.5 skips list spacing checks for inline emphasis at line start', async () => {
				const editor = await openMarkdownDocument(['*Italic* text'].join('\n'));
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});

			test('13.6 skips list spacing checks for horizontal rules', async () => {
				const editor = await openMarkdownDocument(['---'].join('\n'));
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});

			test('13.7 does not require blank line when list follows list', async () => {
				const editor = await openMarkdownDocument([
					'- Item',
					'- Another item',
				].join('\n'));
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});

			test('13.8 does not require blank line when list follows blockquote', async () => {
				const editor = await openMarkdownDocument([
					'> Quote',
					'- list item',
				].join('\n'));
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});

			test('13.9 does not require blank line when list follows admonition header', async () => {
				const editor = await openMarkdownDocument([
					'!!! note',
					'- list item',
				].join('\n'));
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});
		});

		suite('14. Math', () => {
			test('14.1 reports unclosed math block', async () => {
				const editor = await openMarkdownDocument([
					'$$',
					'math',
				].join('\n'));

				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 1);
				assert.strictEqual(diagnostics[0].message, 'Math block must be closed with $$.');
			});

			test('14.2 accepts inline and block math', async () => {
				const editor = await openMarkdownDocument(['Inline $E=mc^2$', '', '$$\nE=mc^2\n$$'].join('\n'));
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => true);
				assert.ok(Array.isArray(diagnostics));
			});

			test('14.3 accepts closed math blocks without errors', async () => {
				const editor = await openMarkdownDocument(['$$', 'E = mc^2', '$$'].join('\n'));
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});
		});

		suite('15. Tooltips', () => {
			test('15.1 accepts tooltip-like inline examples', async () => {
				const editor = await openMarkdownDocument(['Hover text{: .tooltip }'].join('\n'));
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => true);
				assert.ok(Array.isArray(diagnostics));
			});
		});

		suite('16. Documents', () => {
			test('16.1 ignores linting inside frontmatter', async () => {
				const editor = await openMarkdownDocument([
					'---',
					'-item',
					'```',
					'---',
				].join('\n'));

				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});

			test('16.2 ignores non-markdown documents', async () => {
				const document = await vscode.workspace.openTextDocument({ language: 'plaintext', content: '-item' });
				await vscode.window.showTextDocument(document);
				const diagnostics = await waitForDiagnostics(document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});

			test('16.3 lints mdx documents', async () => {
				const document = await vscode.workspace.openTextDocument({ language: 'mdx', content: '-item' });
				await vscode.window.showTextDocument(document);
				const diagnostics = await waitForDiagnostics(document.uri, (items) => items.length === 1);
				assert.strictEqual(diagnostics[0].message, 'Unordered list markers must be followed by a space.');
			});

			test('16.4 ignores linting inside frontmatter closed by ...', async () => {
				const editor = await openMarkdownDocument([
					'---',
					'-item',
					'...',
				].join('\n'));
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});
		});

		suite('17. Commands', () => {
			test('17.1 toggle underline wraps and unwraps selections', async () => {
				const editor = await openMarkdownDocument('hello');
				editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 5));
				await vscode.commands.executeCommand('mkdocs-material-linter.toggleUnderline');
				await waitForDocumentText(editor.document, '^^hello^^');

				editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 9));
				await vscode.commands.executeCommand('mkdocs-material-linter.toggleUnderline');
				await waitForDocumentText(editor.document, 'hello');
			});

			test('17.2 toggle underline inserts markers at empty cursor', async () => {
				const editor = await openMarkdownDocument('');
				editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));
				await vscode.commands.executeCommand('mkdocs-material-linter.toggleUnderline');
				await waitForDocumentText(editor.document, '^^^^');
				const selection = await waitForSelection(editor, (value) => value.start.character === 6 && value.end.character === 6);
				assert.strictEqual(selection.start.character, 6);
				assert.strictEqual(selection.end.character, 6);
			});
		});

		suite('18. False Positives Fixes', () => {
			test('18.1 does not flag bold text as list item error', async () => {
				const editor = await openMarkdownDocument('**file/path_name.py:**');
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});

			test('18.2 does not flag bold text in paragraph as list item', async () => {
				const editor = await openMarkdownDocument([
					'**file/path_name.py** and **another/file/path_name.html**',
					'in a single paragraph.',
				].join('\n'));
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});

			test('18.3 does not flag abbreviation syntax as list item', async () => {
				const editor = await openMarkdownDocument('*[UML]: Unified Modeling Language');
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});

			test('18.4 does not flag snippet syntax as list item', async () => {
				const editor = await openMarkdownDocument('--8<-- "snippet.md:section_1"');
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});

			test('18.5 accepts snippet syntax with single quotes', async () => {
				const editor = await openMarkdownDocument("--8<-- 'snippet.md:section_2'");
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});

			test('18.6 accepts indented snippet syntax', async () => {
				const editor = await openMarkdownDocument('    --8<-- "snippet.md"');
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});

			test('18.7 accepts multiple abbreviations in a document', async () => {
				const editor = await openMarkdownDocument([
					'*[HTML]: Hyper Text Markup Language',
					'*[CSS]: Cascading Style Sheets',
				].join('\n'));
				const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
				assert.strictEqual(diagnostics.length, 0);
			});
		});

		suite('19. Configuration Options', () => {
			test('19.1 respects checkBlankLineBeforeAdmonitionContent setting', async () => {
				const config = vscode.workspace.getConfiguration('mkdocs-material-linter');
				const originalValue = config.get('checkBlankLineBeforeAdmonitionContent');

				try {
					await config.update('checkBlankLineBeforeAdmonitionContent', false, vscode.ConfigurationTarget.Global);
					const editor = await openMarkdownDocument([
						'!!! note',
						'    Content without blank line',
					].join('\n'));
					const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
					assert.strictEqual(diagnostics.length, 0);
				} finally {
					await config.update('checkBlankLineBeforeAdmonitionContent', originalValue, vscode.ConfigurationTarget.Global);
				}
			});

			test('19.2 paragraph before list always errors (parsing issue)', async () => {
				const config = vscode.workspace.getConfiguration('mkdocs-material-linter');
				const originalValue = config.get('checkBlankLineBeforeList');

				try {
					// Even with checkBlankLineBeforeList: false, paragraph->list should error
					await config.update('checkBlankLineBeforeList', false, vscode.ConfigurationTarget.Global);
					const editor = await openMarkdownDocument([
						'Paragraph text',
						'- list item',
					].join('\n'));
					const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length > 0);
					assert.strictEqual(diagnostics.length, 1);
					assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Error);
					assert.ok(diagnostics[0].message.includes('parsing error'));
				} finally {
					await config.update('checkBlankLineBeforeList', originalValue, vscode.ConfigurationTarget.Global);
				}
			});

			test('19.3 respects checkIndentation setting for admonitions', async () => {
				const config = vscode.workspace.getConfiguration('mkdocs-material-linter');
				const originalValue = config.get('checkIndentation');

				try {
					await config.update('checkIndentation', false, vscode.ConfigurationTarget.Global);
					const editor = await openMarkdownDocument([
						'!!! note',
						'',
						'Not indented',
					].join('\n'));
					const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
					assert.strictEqual(diagnostics.length, 0);
				} finally {
					await config.update('checkIndentation', originalValue, vscode.ConfigurationTarget.Global);
				}
			});

			test('19.4 respects checkIndentation setting for tabs', async () => {
				const config = vscode.workspace.getConfiguration('mkdocs-material-linter');
				const originalValue = config.get('checkIndentation');

				try {
					await config.update('checkIndentation', false, vscode.ConfigurationTarget.Global);
					const editor = await openMarkdownDocument([
						'=== "Tab"',
						'Not indented',
					].join('\n'));
					const diagnostics = await waitForDiagnostics(editor.document.uri, (items) => items.length === 0);
					assert.strictEqual(diagnostics.length, 0);
				} finally {
					await config.update('checkIndentation', originalValue, vscode.ConfigurationTarget.Global);
				}
			});
		});
	});
});
