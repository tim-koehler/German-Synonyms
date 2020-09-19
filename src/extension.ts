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

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('German-Synonyms.lookupSynonym', () => {

		const editor = vscode.window.activeTextEditor;
		const text = editor?.document.getText(editor.selection);	

		https.get(`https://www.openthesaurus.de/synonyme/search?q=${text}&format=application/json`, (resp) => {
            let data = '';

            resp.on('data', (chunk) => {
                data += chunk;
            });
  
            resp.on('end', () => {
				const terms = getTerms(data);
				
				if (terms.length === 0) {
					vscode.window.showInformationMessage(`No synonym found for '${text}'`);
				} else {
					showQuickpick(terms);
				}
            });
        }).on("error", (err) => {
            console.log("Error: " + err.message);
        });
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

function getTerms(data: any) {
	const synonym: Synonyms = JSON.parse(data);

	let synonymSet = new Set<string>();
	synonym.synsets.forEach(synset => {
		synset.terms.forEach(term => {
			synonymSet.add(term.term);
		});
	});
	return Array.from(synonymSet.values());
}

function showQuickpick(terms: string[]) {
	const editor = vscode.window.activeTextEditor;
	const quickPick = vscode.window.createQuickPick();
	quickPick.items = terms.map((term: any) => ({ label: term }));
	quickPick.onDidChangeSelection(([item]) => {
		if (item) {
			editor?.edit(edit => edit.replace(editor.selection, item.label));
			quickPick.dispose();
		}
	});
	quickPick.onDidHide(() => quickPick.dispose());
	quickPick.show();
}