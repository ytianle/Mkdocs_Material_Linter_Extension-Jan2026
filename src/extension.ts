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
	'bug',
	'example',
	'quote',
]);

export function activate(context: vscode.ExtensionContext) {
	const diagnostics = vscode.languages.createDiagnosticCollection('mkdocs-material-linter');
	context.subscriptions.push(diagnostics);

	const blockquoteDecoration = vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		backgroundColor: 'rgba(229, 231, 235, 0.7)',
	});
	const tableDecoration = vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		backgroundColor: 'rgba(255, 241, 230, 0.7)',
	});
	const admonitionDecoration = vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		backgroundColor: 'rgba(254, 243, 199, 0.6)',
	});
	context.subscriptions.push(blockquoteDecoration, tableDecoration, admonitionDecoration);

	const lint = (document: vscode.TextDocument) => {
		if (!isMarkdownDocument(document)) {
			return;
		}

		const lines = document.getText().split(/\r?\n/);
		const results: vscode.Diagnostic[] = [];
		const blockquoteRanges: vscode.Range[] = [];
		const tableRanges: vscode.Range[] = [];
		const admonitionRanges: vscode.Range[] = [];

		let inFence = false;
		let fenceMarker = '';
		let inFrontmatter = false;

		let inBlockquote = false;

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
					continue;
				}

				if (line.trimStart().startsWith(fenceMarker)) {
					inFence = false;
					fenceMarker = '';
				}
				continue;
			}

			if (inFence) {
				continue;
			}

			checkAdmonitionSyntax(line, i, document, results);
			checkTabSyntax(line, i, document, results);
			checkListSpacing(lines, i, document, results);
			checkTableSyntax(lines, i, document, results);

			if (isAdmonitionHeader(line)) {
				checkIndentedBody(
					lines,
					i,
					document,
					results,
					'Admonition content must be indented by 4 spaces or a tab.',
					null,
				);
				const endIndex = findAdmonitionBlockEnd(lines, i);
				for (let j = i; j <= endIndex; j += 1) {
					admonitionRanges.push(new vscode.Range(new vscode.Position(j, 0), new vscode.Position(j, lines[j].length)));
				}
			}

			if (isTabHeader(line)) {
				checkIndentedBody(
					lines,
					i,
					document,
					results,
					'Tab content must be indented by 4 spaces or a tab.',
					/^\s*===\s+/,
				);
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
				tableRanges.push(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.length)));
			}
		}

		diagnostics.set(document.uri, results);
		applyDecorations(
			document,
			blockquoteDecoration,
			blockquoteRanges,
			tableDecoration,
			tableRanges,
			admonitionDecoration,
			admonitionRanges,
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
	);
}

export function deactivate() {}

function isMarkdownDocument(document: vscode.TextDocument): boolean {
	return document.languageId === 'markdown' || document.languageId === 'mdx';
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

	const normalizedType = type.toLowerCase();
	if (!ADMONITION_TYPES.has(normalizedType)) {
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
	admonitionDecoration: vscode.TextEditorDecorationType,
	admonitionRanges: vscode.Range[],
): void {
	for (const editor of vscode.window.visibleTextEditors) {
		if (editor.document.uri.toString() !== document.uri.toString()) {
			continue;
		}
		editor.setDecorations(blockquoteDecoration, blockquoteRanges);
		editor.setDecorations(tableDecoration, tableRanges);
		editor.setDecorations(admonitionDecoration, admonitionRanges);
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

function isListLine(line: string): boolean {
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
	return /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$/.test(line);
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
