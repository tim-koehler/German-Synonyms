import * as vscode from 'vscode';
import * as https from 'https';

interface Synonyms {
	synsets: Synsets[]
}

interface Synsets {
	terms: Term[]
}

interface Term {
	term: string
}

export function activate(context: vscode.ExtensionContext): void {

	let disposable = vscode.commands.registerCommand('German-Synonyms.lookupSynonym', () => {

		const editor = vscode.window.activeTextEditor;

		if (editor === undefined) {
			return;
		}

		const doc = editor.document;
		const selection = editor.selection;
		let wordRange: vscode.Range;

		if (selection.isEmpty) {
			wordRange = doc.getWordRangeAtPosition(selection.active) as vscode.Range;

			if (wordRange === undefined) {
				vscode.window.showInformationMessage(`No text found`);
				return;
			}
		} else {
			wordRange = selection;
		}

		const rawWord = doc.getText(wordRange);
		const encodedWord = encodeURI(rawWord);
		console.log(encodedWord);

		const options = {
			hostname: 'www.openthesaurus.de',
			path: `/synonyme/search?q=${encodedWord}&format=application/json`,
			method: 'GET',
			headers: { 'User-Agent': 'https://marketplace.visualstudio.com/items?itemName=Tim-Koehler.german-synonyms&ssr=false' }
		};

		https.get(options, (resp) => {
			let data = '';

			resp.on('data', (chunk) => {
				data += chunk;
			});

			resp.on('end', () => {
				const terms = getTerms(data);

				if (terms.length === 0) {
					vscode.window.showInformationMessage(`No synonym found for '${rawWord}'`);
				} else {
					showQuickpick(terms, editor, wordRange);
				}
			});
		}).on("error", (err) => {
			console.log("Error: " + err.message);
		});
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate(): void {
}

function getTerms(data: string): string[] {
	const synonym: Synonyms = JSON.parse(data);
	return synonym.synsets
		.flatMap(synset => synset.terms)
		.filter((value, index, self) => self.indexOf(value) === index)  // distinct
		.map(term => term.term);
}

function showQuickpick(terms: string[], editor: vscode.TextEditor, wordRange: vscode.Range): void {
	const quickPick = vscode.window.createQuickPick();
	quickPick.items = terms.map((term: any) => ({ label: term }));
	quickPick.onDidChangeSelection(([item]) => {
		if (item) {
			editor.edit(edit => edit.replace(wordRange, item.label));
			quickPick.dispose();
		}
	});
	quickPick.onDidHide(() => quickPick.dispose());
	quickPick.show();
}
