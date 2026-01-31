// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const ADMONITION_TYPES = new Set([
	'note',
	'abstract',
	'info',
	'tip',
	'success',
	'question',
	'warning',
	'failure',
	'danger',
	'error',
	'bug',
	'example',
	'quote',
]);

export function activate(context: vscode.ExtensionContext) {
	const diagnostics = vscode.languages.createDiagnosticCollection('mkdocs-material-linter');
	context.subscriptions.push(diagnostics);

	let blockquoteDecoration = createBlockquoteDecoration(vscode.window.activeColorTheme.kind);
	let tableDecoration = createTableDecoration(vscode.window.activeColorTheme.kind);
	let tableHeaderDecoration = createTableHeaderDecoration(vscode.window.activeColorTheme.kind);
	let tableRowBorderDecoration = createTableRowBorderDecoration(vscode.window.activeColorTheme.kind);
	let tableFirstRowBorderDecoration = createTableFirstRowBorderDecoration(vscode.window.activeColorTheme.kind);
	let codeBlockDecoration = createCodeBlockDecoration(vscode.window.activeColorTheme.kind);
	let admonitionDecorations = createAdmonitionDecorations(vscode.window.activeColorTheme.kind);
	const blockquoteDisposable = new vscode.Disposable(() => blockquoteDecoration.dispose());
	const tableDisposable = new vscode.Disposable(() => tableDecoration.dispose());
	const tableHeaderDisposable = new vscode.Disposable(() => tableHeaderDecoration.dispose());
	const tableRowBorderDisposable = new vscode.Disposable(() => tableRowBorderDecoration.dispose());
	const tableFirstRowBorderDisposable = new vscode.Disposable(() => tableFirstRowBorderDecoration.dispose());
	const admonitionDisposable = new vscode.Disposable(() => admonitionDecorations.dispose());
	const codeBlockDisposable = new vscode.Disposable(() => codeBlockDecoration.dispose());
	context.subscriptions.push(
		blockquoteDisposable,
		tableDisposable,
		tableHeaderDisposable,
		tableRowBorderDisposable,
		tableFirstRowBorderDisposable,
		admonitionDisposable,
		codeBlockDisposable,
	);

	const underlineCommand = vscode.commands.registerCommand('mkdocs-material-linter.toggleUnderline', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		const document = editor.document;
		editor.edit((editBuilder) => {
			for (const selection of editor.selections) {
				const selectedText = document.getText(selection);
				if (selectedText.length === 0) {
					editBuilder.insert(selection.start, '^^^^');
					continue;
				}

				if (selectedText.startsWith('^^') && selectedText.endsWith('^^') && selectedText.length >= 4) {
					editBuilder.replace(selection, selectedText.slice(2, -2));
				} else {
					editBuilder.replace(selection, `^^${selectedText}^^`);
				}
			}
		}).then(() => {
			const updatedSelections = editor.selections.map((selection) => {
				if (selection.isEmpty) {
					const pos = selection.start;
					return new vscode.Selection(
						new vscode.Position(pos.line, pos.character + 2),
						new vscode.Position(pos.line, pos.character + 2),
					);
				}

				if (selection.start.character >= 2 && selection.end.character >= 2) {
					return new vscode.Selection(
						selection.start.translate(0, 2),
						selection.end.translate(0, 2),
					);
				}

				return selection;
			});
			editor.selections = updatedSelections;
		});
	});
	context.subscriptions.push(underlineCommand);

	const lint = (document: vscode.TextDocument) => {
		const text = document.getText();
		if (!isMarkdownDocument(document)) {
			return;
		}
		const lines = text.split(/\r?\n/);
		const results: vscode.Diagnostic[] = [];
		const blockquoteRanges: vscode.Range[] = [];
		const tableRanges: vscode.Range[] = [];
		const tableHeaderRanges: vscode.Range[] = [];
		const tableRowBorderRanges: vscode.Range[] = [];
		const tableFirstRowBorderRanges: vscode.Range[] = [];
		const codeBlockRanges: vscode.Range[] = [];
		const admonitionTitleRanges = createAdmonitionRangeMap();
		const admonitionBackgroundRanges = createAdmonitionRangeMap();
		const admonitionGutterRanges = createAdmonitionGutterRangeMap();
		const admonitionBlocks: AdmonitionBlock[] = [];

		let inFence = false;
		let fenceMarker = '';
		let fenceStartLine = 0;
		let inFrontmatter = false;

		let inBlockquote = false;
		let inMathBlock = false;
		let mathStartLine = 0;
		let inTable = false;
		let tableStart = 0;
		const tableBlocks: Array<{ start: number; end: number }> = [];

		for (let i = 0; i < lines.length; i += 1) {
			const line = lines[i];

			if (i === 0 && isFrontmatterDelimiter(line)) {
				inFrontmatter = true;
				continue;
			}

			if (inFrontmatter) {
				if (isFrontmatterDelimiter(line) || isFrontmatterEnd(line)) {
					inFrontmatter = false;
				}
				continue;
			}

			const fenceMatch = line.match(/^\s*(```+|~~~+)/);
			if (fenceMatch) {
				if (!inFence) {
					inFence = true;
					fenceMarker = fenceMatch[1];
					fenceStartLine = i;
					codeBlockRanges.push(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.length)));
					continue;
				}

				if (line.trimStart().startsWith(fenceMarker)) {
					inFence = false;
					fenceMarker = '';
					codeBlockRanges.push(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.length)));
				}
				continue;
			}

			if (inFence) {
				codeBlockRanges.push(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.length)));
				continue;
			}

			if (isMathBlockDelimiter(line)) {
				if (!inMathBlock) {
					inMathBlock = true;
					mathStartLine = i;
				} else {
					inMathBlock = false;
				}
				continue;
			}

			checkAdmonitionSyntax(line, i, document, results);
			checkTabSyntax(line, i, document, results);
			checkListSpacing(lines, i, document, results);
			checkTableSyntax(lines, i, document, results);
			checkBlankLineBeforeList(lines, i, document, results);

			if (isAdmonitionHeader(line)) {
				const config = vscode.workspace.getConfiguration('mkdocs-material-linter');
				const checkIndentation = config.get<boolean>('checkIndentation', true);
				const checkBlankLine = config.get<boolean>('checkBlankLineBeforeAdmonitionContent', false);

				if (checkIndentation) {
					checkIndentedBody(
						lines,
						i,
						document,
						results,
						'Admonition content must be indented by 4 spaces or a tab.',
						LIST_LINE_REGEX,
					);
				}
				if (checkBlankLine) {
					checkBlankLineBeforeNonListAdmonitionContent(
						lines,
						i,
						document,
						results,
						'Admonition content should start after a blank line unless it is a list.',
					);
				}
				const admonitionType = getAdmonitionType(line);
				const styleKey = normalizeAdmonitionType(admonitionType);
				const endIndex = findAdmonitionBlockEnd(lines, i);
				const indentWidth = getIndentWidth(lines[i]);
				admonitionTitleRanges[styleKey].push(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.length)));
				admonitionBlocks.push({ start: i, end: endIndex, type: styleKey, indentWidth, depth: 0 });
			}

			if (isTabHeader(line)) {
				const config = vscode.workspace.getConfiguration('mkdocs-material-linter');
				const checkIndentation = config.get<boolean>('checkIndentation', true);

				if (checkIndentation) {
					checkIndentedBody(
						lines,
						i,
						document,
						results,
						'Tab content must be indented by 4 spaces or a tab.',
						/^\s*===\s+/,
					);
				}
			}

			if (isBlockquoteLine(line)) {
				inBlockquote = true;
				blockquoteRanges.push(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.length)));
			} else if (inBlockquote && isBlockquoteContinuation(line)) {
				blockquoteRanges.push(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.length)));
			} else {
				inBlockquote = false;
			}

			if (isTableLineAt(lines, i)) {
				if (!inTable) {
					inTable = true;
					tableStart = i;
				}
				tableRanges.push(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.length)));
				if (isTableHeaderLine(lines, i)) {
					tableHeaderRanges.push(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.length)));
				}
			} else if (inTable) {
				tableBlocks.push({ start: tableStart, end: i - 1 });
				inTable = false;
			}
		}

		if (inTable) {
			tableBlocks.push({ start: tableStart, end: lines.length - 1 });
		}

		for (const block of tableBlocks) {
			for (let i = block.start; i <= block.end; i += 1) {
				const line = lines[i];
				tableRowBorderRanges.push(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.length)));
				if (i === block.start) {
					tableFirstRowBorderRanges.push(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.length)));
				}
			}
		}

		if (inFence) {
			addDiagnostic(
				results,
				document,
				fenceStartLine,
				0,
				lines[fenceStartLine].length,
				'Code fence must be closed.',
				vscode.DiagnosticSeverity.Error,
			);
		}

		if (inMathBlock) {
			addDiagnostic(
				results,
				document,
				mathStartLine,
				0,
				lines[mathStartLine].length,
				'Math block must be closed with $$.',
				vscode.DiagnosticSeverity.Error,
			);
		}

		diagnostics.set(document.uri, results);
		buildAdmonitionRanges(admonitionBlocks, lines, admonitionBackgroundRanges, admonitionGutterRanges);
		applyDecorations(
			document,
			blockquoteDecoration,
			blockquoteRanges,
			tableDecoration,
			tableRanges,
			tableHeaderDecoration,
			tableHeaderRanges,
			tableRowBorderDecoration,
			tableRowBorderRanges,
			tableFirstRowBorderDecoration,
			tableFirstRowBorderRanges,
			codeBlockDecoration,
			codeBlockRanges,
			admonitionDecorations,
			admonitionTitleRanges,
			admonitionBackgroundRanges,
			admonitionGutterRanges,
		);
	};

	const lintActive = () => {
		for (const document of vscode.workspace.textDocuments) {
			lint(document);
		}
	};

	lintActive();

	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(lint),
		vscode.workspace.onDidChangeTextDocument((event) => lint(event.document)),
		vscode.workspace.onDidSaveTextDocument(lint),
		vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri)),
		vscode.window.onDidChangeVisibleTextEditors(() => lintActive()),
		vscode.window.onDidChangeActiveColorTheme((theme) => {
			blockquoteDecoration.dispose();
			tableDecoration.dispose();
			tableHeaderDecoration.dispose();
			tableRowBorderDecoration.dispose();
			tableFirstRowBorderDecoration.dispose();
			admonitionDecorations.dispose();
			blockquoteDecoration = createBlockquoteDecoration(theme.kind);
			tableDecoration = createTableDecoration(theme.kind);
			tableHeaderDecoration = createTableHeaderDecoration(theme.kind);
			tableRowBorderDecoration = createTableRowBorderDecoration(theme.kind);
			tableFirstRowBorderDecoration = createTableFirstRowBorderDecoration(theme.kind);
			admonitionDecorations = createAdmonitionDecorations(theme.kind);
			codeBlockDecoration.dispose();
			codeBlockDecoration = createCodeBlockDecoration(theme.kind);
			lintActive();
		}),
	);
}

export function deactivate() {}

function isMarkdownDocument(document: vscode.TextDocument): boolean {
	const languageId = document.languageId.toLowerCase();
	return languageId === 'markdown'
		|| languageId === 'mdx'
		|| languageId === 'markdownreact';
}

function checkAdmonitionSyntax(
	line: string,
	lineIndex: number,
	document: vscode.TextDocument,
	results: vscode.Diagnostic[],
): void {
	const headerMatch = line.match(/^\s*(\!\!\!|\?\?\?\+|\?\?\?)\s*(.+)$/);
	if (!headerMatch) {
		return;
	}

	const rest = headerMatch[2].trim();
	if (rest.length === 0) {
		addDiagnostic(results, document, lineIndex, 0, line.length, 'Admonition type is required.', vscode.DiagnosticSeverity.Error);
		return;
	}

	const type = rest.split(/\s+/)[0];
	if (!/^[a-zA-Z][\w-]*$/.test(type)) {
		addDiagnostic(results, document, lineIndex, 0, line.length, 'Admonition type must be a simple identifier.', vscode.DiagnosticSeverity.Error);
		return;
	}

	const normalizedType = normalizeAdmonitionType(type);
	if (!ADMONITION_TYPES.has(normalizedType) && normalizedType !== 'danger') {
		addDiagnostic(results, document, lineIndex, 0, line.length, `Unknown admonition type: "${type}".`, vscode.DiagnosticSeverity.Warning);
	}

	if (hasUnclosedQuote(rest)) {
		addDiagnostic(results, document, lineIndex, 0, line.length, 'Admonition title has an unclosed quote.', vscode.DiagnosticSeverity.Error);
	}
}

function checkTabSyntax(
	line: string,
	lineIndex: number,
	document: vscode.TextDocument,
	results: vscode.Diagnostic[],
): void {
	const missingSpaceMatch = line.match(/^\s*===(\S)/);
	if (missingSpaceMatch) {
		const markerIndex = line.indexOf('===');
		const errorIndex = markerIndex + 3;
		const range = new vscode.Range(
			new vscode.Position(lineIndex, errorIndex),
			new vscode.Position(lineIndex, Math.min(errorIndex + 1, line.length)),
		);
		results.push(new vscode.Diagnostic(range, 'Tab marker must be followed by a space.', vscode.DiagnosticSeverity.Error));
		return;
	}

	const headerMatch = line.match(/^\s*===\s+(.+)$/);
	if (!headerMatch) {
		return;
	}

	const title = headerMatch[1].trim();
	if (!/^(['"]).*\1$/.test(title)) {
		addDiagnostic(results, document, lineIndex, 0, line.length, 'Tab title must be wrapped in matching quotes.', vscode.DiagnosticSeverity.Error);
	}
}

function checkListSpacing(
	lines: string[],
	lineIndex: number,
	document: vscode.TextDocument,
	results: vscode.Diagnostic[],
): void {
	const line = lines[lineIndex];
	if (startsWithInlineEmphasis(line)) {
		return;
	}

	// Skip abbreviation syntax: *[ABBR]: definition
	if (isAbbreviationDefinition(line)) {
		return;
	}

	// Skip snippet syntax: --8<-- "file.md"
	if (isSnippetSyntax(line)) {
		return;
	}

	if (isHorizontalRule(line) || isFrontmatterDelimiter(line) || isTableLineAt(lines, lineIndex)) {
		return;
	}

	if (/^\s*[-+*](\S)/.test(line)) {
		addDiagnostic(results, document, lineIndex, 0, line.length, 'Unordered list markers must be followed by a space.', vscode.DiagnosticSeverity.Error);
	}

	if (/^\s*\d+\.(\S)/.test(line)) {
		addDiagnostic(results, document, lineIndex, 0, line.length, 'Ordered list markers must be followed by a space.', vscode.DiagnosticSeverity.Error);
	}

	if (/^\s*[-+*]\s+\[[ xX]\](\S)/.test(line)) {
		addDiagnostic(results, document, lineIndex, 0, line.length, 'Task list checkboxes must be followed by a space.', vscode.DiagnosticSeverity.Error);
	}
}

function checkTableSyntax(
	lines: string[],
	lineIndex: number,
	document: vscode.TextDocument,
	results: vscode.Diagnostic[],
): void {
	const line = lines[lineIndex];
	if (!isTableLineAt(lines, lineIndex) || isTableSeparatorLine(line)) {
		return;
	}

	const prevIndex = findPrevNonEmptyLine(lines, lineIndex);
	if (prevIndex !== null) {
		const prevLine = lines[prevIndex];
		if (isTableRowLine(prevLine) || isTableSeparatorLine(prevLine)) {
			return;
		}
	}

	const nextIndex = findNextNonEmptyLine(lines, lineIndex + 1);
	if (nextIndex === null) {
		return;
	}

	const nextLine = lines[nextIndex];
	if (!isTableSeparatorLine(nextLine)) {
		addDiagnostic(
			results,
			document,
			lineIndex,
			0,
			line.length,
			'Table header must be followed by a separator row.',
			vscode.DiagnosticSeverity.Error,
		);
		return;
	}

	const headerCols = countTableColumns(line);
	const separatorCols = countTableColumns(nextLine);
	if (headerCols !== separatorCols) {
		addDiagnostic(
			results,
			document,
			nextIndex,
			0,
			nextLine.length,
			'Table separator column count must match the header.',
			vscode.DiagnosticSeverity.Error,
		);
	}
}

function checkBlankLineBeforeList(
	lines: string[],
	lineIndex: number,
	document: vscode.TextDocument,
	results: vscode.Diagnostic[],
): void {
	const line = lines[lineIndex];
	if (!isListLine(line)) {
		return;
	}

	if (lineIndex === 0) {
		return;
	}

	const prevLine = lines[lineIndex - 1];
	if (prevLine.trim().length === 0) {
		return;
	}

	// Always skip these cases (won't cause parsing issues)
	if (isListLine(prevLine) || isBlockquoteLine(prevLine) || isTableLineAt(lines, lineIndex) || 
		isAdmonitionHeader(prevLine)) {
		return;
	}

	const config = vscode.workspace.getConfiguration('mkdocs-material-linter');
	const checkBlankLineBeforeList = config.get<boolean>('checkBlankLineBeforeList', false);

	// Check if previous line is heading, horizontal rule, or code fence
	const isHeading = /^\s*#{1,6}\s+/.test(prevLine);
	const isHR = isHorizontalRule(prevLine);
	const isFenceClosing = prevLine.trim().startsWith('```') || prevLine.trim().startsWith('~~~');
	
	// Critical: paragraph followed by list will cause parsing failure
	// This is always an error regardless of configuration
	const isParagraphLine = prevLine.trim().length > 0 && 
		!isListLine(prevLine) && 
		!isBlockquoteLine(prevLine) && 
		!isAdmonitionHeader(prevLine) &&
		!isTabHeader(prevLine) &&
		!isHeading &&
		!isHR &&
		!isFenceClosing;

	if (isParagraphLine) {
		// This is a critical parsing error - always report
		const range = new vscode.Range(
			new vscode.Position(lineIndex, 0),
			new vscode.Position(lineIndex, Math.min(1, line.length)),
		);
		results.push(new vscode.Diagnostic(
			range, 
			'List after paragraph requires a blank line (parsing error).', 
			vscode.DiagnosticSeverity.Error
		));
		return;
	}

	// For heading, horizontal rule, or code fence: only warn if config is enabled
	if (checkBlankLineBeforeList && (isHeading || isHR || isFenceClosing)) {
		const range = new vscode.Range(
			new vscode.Position(lineIndex, 0),
			new vscode.Position(lineIndex, Math.min(1, line.length)),
		);
		results.push(new vscode.Diagnostic(
			range, 
			'List items should be preceded by a blank line.', 
			vscode.DiagnosticSeverity.Warning
		));
	}
}

function startsWithInlineEmphasis(line: string): boolean {
	// Check for bold: **text** or __text__
	// Check for italic: *text* or _text_
	// Also check for bold in middle of line followed by text like: **file/path_name.py**
	return (
		/^\s*(\*\*|__)\S[^*_]*\1/.test(line)
		|| /^\s*(\*|_)\S([^*_]|\\\*)+\1/.test(line)
		|| /^\s*\*\*[^*\s][^*]*\*\*/.test(line)
	);
}

function checkIndentedBody(
	lines: string[],
	headerIndex: number,
	document: vscode.TextDocument,
	results: vscode.Diagnostic[],
	message: string,
	skipIfMatches: RegExp | null,
): void {
	const nextIndex = findNextNonEmptyLine(lines, headerIndex + 1);
	if (nextIndex === null) {
		return;
	}

	const nextLine = lines[nextIndex];
	if (skipIfMatches && skipIfMatches.test(nextLine)) {
		return;
	}

	// If next line starts at column 0 (no indentation at all), it's not part of this block
	const nextLineIndent = getLeadingWhitespace(nextLine);
	if (nextLineIndent.length === 0) {
		return;
	}

	// Skip if next line is a block-level element (heading, admonition, tab, horizontal rule, etc.)
	if (isAdmonitionHeader(nextLine) || isTabHeader(nextLine) || 
		/^\s*#{1,6}\s+/.test(nextLine) || isHorizontalRule(nextLine) ||
		startsWithInlineEmphasis(nextLine)) {
		return;
	}

	const headerIndentation = getLeadingWhitespace(lines[headerIndex]);
	if (!hasRequiredIndentation(nextLine, headerIndentation)) {
		const firstNonWhitespace = nextLine.search(/\S|$/);
		const range = new vscode.Range(
			new vscode.Position(nextIndex, firstNonWhitespace),
			new vscode.Position(nextIndex, Math.min(firstNonWhitespace + 1, nextLine.length)),
		);
		results.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error));
	}
}

function checkBlankLineBeforeNonListAdmonitionContent(
	lines: string[],
	headerIndex: number,
	document: vscode.TextDocument,
	results: vscode.Diagnostic[],
	message: string,
): void {
	const nextLineIndex = headerIndex + 1;
	if (nextLineIndex >= lines.length) {
		return;
	}

	if (lines[nextLineIndex].trim().length === 0) {
		return;
	}

	const nextLine = lines[nextLineIndex];
	if (isListLine(nextLine)) {
		return;
	}

	const range = new vscode.Range(
		new vscode.Position(nextLineIndex, 0),
		new vscode.Position(nextLineIndex, Math.min(1, nextLine.length)),
	);
	results.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error));
}

function isHorizontalRule(line: string): boolean {
	return /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line);
}

function isFrontmatterDelimiter(line: string): boolean {
	return /^\s*---\s*$/.test(line);
}

function isFrontmatterEnd(line: string): boolean {
	return /^\s*\.\.\.\s*$/.test(line);
}

function isAdmonitionHeader(line: string): boolean {
	return /^\s*(\!\!\!|\?\?\?\+|\?\?\?)\s*/.test(line);
}

function isTabHeader(line: string): boolean {
	return /^\s*===\s+/.test(line);
}

const LIST_LINE_REGEX = /^\s*(?:[-+*]\s+|\d+\.\s+|[-+*]\s+\[[ xX]\]\s+)/;

function findNextNonEmptyLine(lines: string[], startIndex: number): number | null {
	for (let i = startIndex; i < lines.length; i += 1) {
		if (lines[i].trim().length > 0) {
			return i;
		}
	}
	return null;
}

function findPrevNonEmptyLine(lines: string[], startIndex: number): number | null {
	for (let i = startIndex - 1; i >= 0; i -= 1) {
		if (lines[i].trim().length > 0) {
			return i;
		}
	}
	return null;
}

function addDiagnostic(
	results: vscode.Diagnostic[],
	document: vscode.TextDocument,
	lineIndex: number,
	startChar: number,
	endChar: number,
	message: string,
	severity: vscode.DiagnosticSeverity,
): void {
	const range = new vscode.Range(
		new vscode.Position(lineIndex, startChar),
		new vscode.Position(lineIndex, endChar),
	);
	results.push(new vscode.Diagnostic(range, message, severity));
}

function hasUnclosedQuote(text: string): boolean {
	if (!/\s["']/.test(text)) {
		return false;
	}

	const doubleCount = (text.match(/"/g) ?? []).length;
	if (doubleCount > 0) {
		return doubleCount % 2 === 1;
	}

	const singleCount = (text.match(/'/g) ?? []).length;
	return singleCount % 2 === 1;
}

function getLeadingWhitespace(line: string): string {
	const match = line.match(/^[\t ]*/);
	return match ? match[0] : '';
}

function hasRequiredIndentation(line: string, headerIndentation: string): boolean {
	if (!line.startsWith(headerIndentation)) {
		return false;
	}

	const remainder = line.slice(headerIndentation.length);
	return remainder.startsWith('\t') || remainder.startsWith('    ');
}

function applyDecorations(
	document: vscode.TextDocument,
	blockquoteDecoration: vscode.TextEditorDecorationType,
	blockquoteRanges: vscode.Range[],
	tableDecoration: vscode.TextEditorDecorationType,
	tableRanges: vscode.Range[],
	tableHeaderDecoration: vscode.TextEditorDecorationType,
	tableHeaderRanges: vscode.Range[],
	tableRowBorderDecoration: vscode.TextEditorDecorationType,
	tableRowBorderRanges: vscode.Range[],
	tableFirstRowBorderDecoration: vscode.TextEditorDecorationType,
	tableFirstRowBorderRanges: vscode.Range[],
	codeBlockDecoration: vscode.TextEditorDecorationType,
	codeBlockRanges: vscode.Range[],
	admonitionDecorations: AdmonitionDecorations,
	admonitionTitleRanges: AdmonitionRangeMap,
	admonitionBackgroundRanges: AdmonitionRangeMap,
	admonitionGutterRanges: AdmonitionGutterRangeMap,
): void {
	for (const editor of vscode.window.visibleTextEditors) {
		if (editor.document.uri.toString() !== document.uri.toString()) {
			continue;
		}
		editor.setDecorations(blockquoteDecoration, blockquoteRanges);
		editor.setDecorations(tableDecoration, tableRanges);
		editor.setDecorations(tableHeaderDecoration, tableHeaderRanges);
		editor.setDecorations(tableRowBorderDecoration, tableRowBorderRanges);
		editor.setDecorations(tableFirstRowBorderDecoration, tableFirstRowBorderRanges);
		editor.setDecorations(codeBlockDecoration, codeBlockRanges);
		for (const [type, decoration] of Object.entries(admonitionDecorations.byType)) {
			editor.setDecorations(decoration.title, admonitionTitleRanges[type]);
			editor.setDecorations(decoration.block, admonitionBackgroundRanges[type]);
			const gutterRanges = admonitionGutterRanges[type];
			for (let depth = 0; depth < decoration.gutter.length; depth += 1) {
				editor.setDecorations(decoration.gutter[depth], gutterRanges[depth] ?? []);
			}
		}
	}
}

function isBlockquoteLine(line: string): boolean {
	return /^\s*>\s*\S/.test(line);
}

function isBlockquoteContinuation(line: string): boolean {
	if (line.trim().length === 0) {
		return false;
	}
	return /^\s{2,}|\t/.test(line) || isListLine(line);
}

function isTableLineAt(lines: string[], lineIndex: number): boolean {
	const line = lines[lineIndex];
	if (isTableSeparatorLine(line)) {
		return true;
	}

	if (!isTableRowLine(line)) {
		return false;
	}

	const pipeCount = (line.match(/\|/g) ?? []).length;
	if (pipeCount >= 2) {
		return true;
	}

	const prevIndex = findPrevNonEmptyLine(lines, lineIndex);
	if (prevIndex !== null && isTableSeparatorLine(lines[prevIndex])) {
		return true;
	}

	const nextIndex = findNextNonEmptyLine(lines, lineIndex + 1);
	if (nextIndex !== null && isTableSeparatorLine(lines[nextIndex])) {
		return true;
	}

	return false;
}

function isTableHeaderLine(lines: string[], lineIndex: number): boolean {
	const line = lines[lineIndex];
	if (!isTableRowLine(line) || isTableSeparatorLine(line)) {
		return false;
	}

	const nextIndex = findNextNonEmptyLine(lines, lineIndex + 1);
	if (nextIndex === null) {
		return false;
	}

	return isTableSeparatorLine(lines[nextIndex]);
}

function isMathBlockDelimiter(line: string): boolean {
	return /^\s*\$\$\s*$/.test(line);
}

function createCodeBlockDecoration(kind: vscode.ColorThemeKind): vscode.TextEditorDecorationType {
	const backgroundColor = kind === vscode.ColorThemeKind.Dark
		? 'rgba(11, 18, 32, 0.5)'
		: 'rgba(15, 23, 42, 0.5)';
	return vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		backgroundColor,
		color: '#86EFAC',
	});
}

function createBlockquoteDecoration(kind: vscode.ColorThemeKind): vscode.TextEditorDecorationType {
	const backgroundColor = kind === vscode.ColorThemeKind.Dark
		? 'rgba(42, 47, 56, 0.45)'
		: 'rgba(229, 231, 235, 0.7)';
	return vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		backgroundColor,
	});
}

function createTableDecoration(kind: vscode.ColorThemeKind): vscode.TextEditorDecorationType {
	const backgroundColor = kind === vscode.ColorThemeKind.Dark
		? 'rgba(58, 45, 36, 0.45)'
		: 'rgba(255, 241, 230, 0.7)';
	return vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		backgroundColor,
	});
}

function createTableHeaderDecoration(kind: vscode.ColorThemeKind): vscode.TextEditorDecorationType {
	const backgroundColor = kind === vscode.ColorThemeKind.Dark
		? 'rgba(79, 60, 46, 0.6)'
		: 'rgba(249, 219, 186, 0.6)';
	return vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		backgroundColor,
		fontWeight: 'bold',
	});
}

function createTableRowBorderDecoration(kind: vscode.ColorThemeKind): vscode.TextEditorDecorationType {
	const borderColor = kind === vscode.ColorThemeKind.Dark ? '#5a4a3e' : '#e0cda9';
	return vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		borderStyle: 'solid',
		borderColor,
		borderWidth: '0 1px 1px 1px',
	});
}

function createTableFirstRowBorderDecoration(kind: vscode.ColorThemeKind): vscode.TextEditorDecorationType {
	const borderColor = kind === vscode.ColorThemeKind.Dark ? '#5a4a3e' : '#e0cda9';
	return vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		borderStyle: 'solid',
		borderColor,
		borderWidth: '1px 1px 1px 1px',
	});
}

// Check if line is an abbreviation definition: *[ABBR]: Full text
function isAbbreviationDefinition(line: string): boolean {
	return /^\s*\*\[[^\]]+\]:\s+.+/.test(line);
}

// Check if line is a snippet include: --8<-- "file.md" or --8<-- "file.md:section"
function isSnippetSyntax(line: string): boolean {
	return /^\s*--8<--\s+["'][^"']+["']/.test(line);
}

function isListLine(line: string): boolean {
	// Skip abbreviation syntax
	if (isAbbreviationDefinition(line)) {
		return false;
	}

	// Skip snippet syntax
	if (isSnippetSyntax(line)) {
		return false;
	}

	return (
		/^\s*[-+*]\s+/.test(line)
		|| /^\s*\d+\.\s+/.test(line)
		|| /^\s*[-+*]\s+\[[ xX]\]\s+/.test(line)
	);
}

function isTableRowLine(line: string): boolean {
	const pipeCount = (line.match(/\|/g) ?? []).length;
	if (pipeCount === 0) {
		return false;
	}

	const trimmed = line.trim();
	if (trimmed.startsWith('|') || trimmed.endsWith('|')) {
		return pipeCount >= 2;
	}

	if (pipeCount === 1) {
		return /\s\|\s/.test(line);
	}

	return true;
}

function isTableSeparatorLine(line: string): boolean {
	if (!line.includes('|')) {
		return false;
	}
	return /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/.test(line);
}

function countTableColumns(line: string): number {
	const trimmed = line.trim();
	let content = trimmed;
	if (content.startsWith('|')) {
		content = content.slice(1);
	}
	if (content.endsWith('|')) {
		content = content.slice(0, -1);
	}
	return content.split('|').length;
}

function findAdmonitionBlockEnd(lines: string[], startIndex: number): number {
	const headerIndentation = getLeadingWhitespace(lines[startIndex]);
	let lastIndentedIndex = startIndex;
	for (let i = startIndex + 1; i < lines.length; i += 1) {
		const line = lines[i];
		if (line.trim().length === 0) {
			continue;
		}
		if (!hasRequiredIndentation(line, headerIndentation)) {
			return lastIndentedIndex;
		}
		lastIndentedIndex = i;
	}
	return lastIndentedIndex;
}

type AdmonitionRangeMap = Record<string, vscode.Range[]>;

type AdmonitionDecorations = {
	byType: Record<string, { block: vscode.TextEditorDecorationType; title: vscode.TextEditorDecorationType; gutter: vscode.TextEditorDecorationType[] }>;
	dispose: () => void;
};

type AdmonitionBlock = {
	start: number;
	end: number;
	type: string;
	indentWidth: number;
	depth: number;
};

function createAdmonitionRangeMap(): AdmonitionRangeMap {
	const types = ['note', 'abstract', 'info', 'tip', 'success', 'question', 'warning', 'danger', 'bug', 'example', 'quote', 'default'];
	return Object.fromEntries(types.map((type) => [type, []]));
}

type AdmonitionGutterRangeMap = Record<string, vscode.Range[][]>;

const MAX_ADMONITION_DEPTH = 4;

function createAdmonitionGutterRangeMap(): AdmonitionGutterRangeMap {
	const types = ['note', 'abstract', 'info', 'tip', 'success', 'question', 'warning', 'danger', 'bug', 'example', 'quote', 'default'];
	return Object.fromEntries(
		types.map((type) => [type, Array.from({ length: MAX_ADMONITION_DEPTH }, () => [])]),
	);
}

function normalizeAdmonitionType(type: string): string {
	const normalized = type.toLowerCase();
	if (normalized === 'failure' || normalized === 'danger' || normalized === 'error') {
		return 'danger';
	}
	if (normalized === 'note' || normalized === 'abstract' || normalized === 'info' || normalized === 'tip' || normalized === 'success'
		|| normalized === 'question' || normalized === 'warning' || normalized === 'bug' || normalized === 'example' || normalized === 'quote') {
		return normalized;
	}
	return 'default';
}

function getAdmonitionType(line: string): string {
	const headerMatch = line.match(/^\s*(\!\!\!|\?\?\?\+|\?\?\?)\s*(.+)$/);
	if (!headerMatch) {
		return 'default';
	}
	const rest = headerMatch[2].trim();
	if (!rest) {
		return 'default';
	}
	return rest.split(/\s+/)[0];
}

function createAdmonitionDecorations(kind: vscode.ColorThemeKind): AdmonitionDecorations {
	const palette = kind === vscode.ColorThemeKind.Dark ? {
		note: { bg: '#1b2434', border: '#3a4c69', title: '#222d41' },
		abstract: { bg: '#1d222b', border: '#3b4452', title: '#232938' },
		info: { bg: '#1b2b2c', border: '#3a5b5e', title: '#223638' },
		tip: { bg: '#1e2b23', border: '#3d5c43', title: '#26352c' },
		success: { bg: '#1e2b29', border: '#3c5f57', title: '#253536' },
		question: { bg: '#2f2a1c', border: '#6b5a2d', title: '#332a1c' },
		warning: { bg: '#2b2418', border: '#6b542e', title: '#362d1f' },
		danger: { bg: '#2f221e', border: '#6b4232', title: '#3a2a25' },
		bug: { bg: '#2a1d1f', border: '#5c3535', title: '#352427' },
		example: { bg: '#1f2635', border: '#3f4f6c', title: '#263043' },
		quote: { bg: '#232323', border: '#424242', title: '#2b2b2b' },
		default: { bg: '#20222a', border: '#3a3a3a', title: '#252525' },
	} : {
		note: { bg: '#eef3fb', border: '#c6d3e6', title: '#e3ecf8' },
		abstract: { bg: '#f0f6ff', border: '#c9daf1', title: '#e6f0fb' },
		info: { bg: '#eaf7f8', border: '#c7e1e5', title: '#def0f2' },
		tip: { bg: '#eef7ef', border: '#cbe0cf', title: '#e2efe4' },
		success: { bg: '#e9f6f2', border: '#c6ddd6', title: '#dfeee8' },
		question: { bg: '#f6ead1', border: '#e1c48c', title: '#f3e5c7' },
		warning: { bg: '#f9f1e4', border: '#e0cda9', title: '#f0e4d2' },
		danger: { bg: '#f7ece7', border: '#e1b9ad', title: '#edd9d2' },
		bug: { bg: '#f6e8e8', border: '#d8b2b2', title: '#eed6d6' },
		example: { bg: '#edf0ff', border: '#cdd6f1', title: '#e2e7fb' },
		quote: { bg: '#f2f2f2', border: '#d2d2d2', title: '#e6e6e6' },
		default: { bg: '#f5f5f5', border: '#dcdcdc', title: '#eeeeee' },
	};

	const byType: AdmonitionDecorations['byType'] = {};
	const disposables: vscode.TextEditorDecorationType[] = [];
	for (const [type, colors] of Object.entries(palette)) {
		const block = vscode.window.createTextEditorDecorationType({
			isWholeLine: true,
			backgroundColor: hexToRgba(colors.bg, 0.26),
		});
		const title = vscode.window.createTextEditorDecorationType({
			isWholeLine: true,
			backgroundColor: hexToRgba(colors.title, 0.36),
			border: `1px solid ${colors.border}`,
		});
		const gutters = Array.from({ length: MAX_ADMONITION_DEPTH }, (_, depth) => {
			const leftOffset = depth * 6;
			return vscode.window.createTextEditorDecorationType({
				isWholeLine: true,
				before: {
					contentText: ' ',
					backgroundColor: colors.border,
					margin: `0 10px 0 ${leftOffset}px`,
					width: '4px',
					height: '1em',
				},
			});
		});
		byType[type] = { block, title, gutter: gutters };
		disposables.push(block, title, ...gutters);
	}

	return {
		byType,
		dispose: () => {
			for (const decoration of disposables) {
				decoration.dispose();
			}
		},
	};
}

function buildAdmonitionRanges(
	blocks: AdmonitionBlock[],
	lines: string[],
	backgroundMap: AdmonitionRangeMap,
	gutterMap: AdmonitionGutterRangeMap,
): void {
	const sortedBlocks = [...blocks].sort((a, b) => a.start - b.start || a.end - b.end);
	const stack: AdmonitionBlock[] = [];
	for (const block of sortedBlocks) {
		while (stack.length > 0 && block.start > stack[stack.length - 1].end) {
			stack.pop();
		}

		let depth = 0;
		for (let i = stack.length - 1; i >= 0; i -= 1) {
			if (block.start <= stack[i].end && block.indentWidth > stack[i].indentWidth) {
				depth = stack[i].depth + 1;
				break;
			}
		}
		block.depth = Math.min(depth, MAX_ADMONITION_DEPTH - 1);
		stack.push(block);

		for (let i = block.start; i <= block.end; i += 1) {
			backgroundMap[block.type].push(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, lines[i].length)));
			gutterMap[block.type][block.depth].push(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, lines[i].length)));
		}
	}
}

function getIndentWidth(line: string): number {
	let width = 0;
	for (const char of line) {
		if (char === '\t') {
			width += 4;
		} else if (char === ' ') {
			width += 1;
		} else {
			break;
		}
	}
	return width;
}

function hexToRgba(hex: string, alpha: number): string {
	const normalized = hex.replace('#', '');
	const r = parseInt(normalized.slice(0, 2), 16);
	const g = parseInt(normalized.slice(2, 4), 16);
	const b = parseInt(normalized.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
