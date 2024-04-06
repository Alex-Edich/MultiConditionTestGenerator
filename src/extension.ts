// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	//console.log('Congratulations, your extension "mctg" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('mctg.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from MultiConditionTestGenerator!');
	});
	context.subscriptions.push(disposable);

	let createSampleCode = vscode.commands.registerCommand('mf.createSampleCode', function () {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			editor.edit(editBuilder => { 
				//write at the end of the document
				const cursorPosition = editor.document.lineAt(editor.document.lineCount - 1).range.end;
				//write code
				editBuilder.insert(cursorPosition, "\n\n//This is for debugging\n" +
													"public int bonus(int score, int alt) {\n" +
													"int ergebnis = 0;\n" +
													"if (score > 2600) {\n" +
													"\tergebnis = 20;\n" +
													"} else {\n" +
													"\tergebnis = 5;\n" +
													"}\n" +
													"if (alt > 42 && score > 900) {\n" +
													"\tergebnis += 10;\n" +
													"}\n" +
													"return ergebnis;\n" +
													"}\n");
			});
		}
	});
	context.subscriptions.push(createSampleCode);
}

// This method is called when your extension is deactivated
export function deactivate() {}
