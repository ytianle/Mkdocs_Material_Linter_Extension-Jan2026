import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	version: '1.108.2',
	mocha: {
		ui: 'tdd',
		timeout: 5000,
	},
});
