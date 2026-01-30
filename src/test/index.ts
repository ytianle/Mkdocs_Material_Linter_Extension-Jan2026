import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
	try {
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');
		const extensionTestsPath = path.resolve(__dirname, './extension.test');

		await runTests({ extensionDevelopmentPath, extensionTestsPath });
	} catch (error) {
		console.error('Failed to run tests.');
		if (error instanceof Error) {
			console.error(error.message);
			console.error(error.stack);
		} else {
			console.error(error);
		}
		process.exit(1);
	}
}

void main();
