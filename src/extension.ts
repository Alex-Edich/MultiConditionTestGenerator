// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import ts, { SyntaxKind } from 'typescript';
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	//Show command sendParametersToPopup only on function names
	vscode.window.onDidChangeTextEditorSelection(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            // Prüfe, ob die Auswahl ein Funktionsname ist
			//vscode.commands.executeCommand('setContext', 'mf.helloWorldVisible', isFunctionName("function"));
            
			//const selectedText = editor.document.lineAt(editor.selection.active.line);
            if (isFunctionNameSelected()) {
                // Aktiviere den Befehl nur, wenn die Auswahl ein Funktionsname ist
				//console.log('Funktionsname ausgewählt!');
                vscode.commands.executeCommand('setContext',  'mf.contextOptionVisible', true);
            } else {
				//console.log('Funktionsname nicht ausgewählt!');
                vscode.commands.executeCommand('setContext',  'mf.contextOptionVisible', false);
            }
        }
	});

	/**
	 * checks whether the mouse cursor is above a function. Looks for public keyword at the beginning of the line.
	 * @returns true, when selection is above a function
	 */
	function isFunctionNameSelected() {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			//read entire line at the selection cursor
			const selectedTextLine = editor.document.lineAt(editor.selection.active.line).text;
			//prepare scanner
			const scanner = ts.createScanner(ts.ScriptTarget.Latest, false);
			scanner.setText(selectedTextLine);
			//fetch first token
			scanner.scan();
			const tokenKind = scanner.getToken();
			//const tokenName = ts.SyntaxKind[tokenKind];
			//return true, when first token reads public
			return tokenKind === ts.SyntaxKind.PublicKeyword;
		}
	}

	/**
	 * opens a popup for the generated test
	 * @param functionName the name of the function in the popup title
	 * @returns the popup panel
	 */
	function openPopup(functionName: string) {
		// Erstelle ein Webview-Panel
		const panel = vscode.window.createWebviewPanel(
			'popup', // Eindeutiger Bezeichner
			'mctg: ' + functionName,
			vscode.ViewColumn.Beside,// One,
			{}
		);
		return panel;
	}

	function getWebviewContent(functionName: string, returnType : string, 
		parameterNames : string[], parameterTypes : string[], 
		fullConditions : string[], singleConditions : string[][],
		calculatedCases: string[][]) {
		let caseTable : string = ` caseTable`;
		// HTML für das Popup erstellen
		return `
			<!DOCTYPE html>
			<html>
			<head>
			<title>Page Title</title>
			</head>
			<style>
				table.content, td.content, th.content {
					border: 1px solid black;
					border-collapse: collapse;
				}
				td {
					padding: 2px;
					padding-left: 5px;
					padding-right: 5px;
				}
				input {
					color: LightGray;
					background-color: #2A2A2A;
				}
			</style>
			<body>
				<h1>Multiple Condition Test Generator</h1>
				<h2>Creating tests for function: ` + functionName + ` </h2>
				<hr>
				<table class="descriptor" style="width:50%">
					<tr>
						<td>
							parameters
						</td>
						<td>
							<table class="content" style="width:100%">
								<tr>
									<td class="content">int score</td>
									<td class="content">int alt</td>
								</tr>
							</table>    
						</td>
					</tr>
					<tr>
						<td>
							full conditions
						</td>
						<td>
							<table class="content" style="width:100%">
								<tr>
									<td class="content">score > 2600</td>
									<td class="content">alt > 42 && score > 900</td>
								</tr>
							</table>    
						</td>
					</tr>
					<tr>
						<td>
							single conditions
						</td>
						<td>
							<table class="content" style="width:100%">
								<tr>
									<td class="content">score > 2600</td>
									<td class="content">alt > 42</td>
									<td class="content">score > 900</td>
								</tr>
							</table>    
						</td>
					</tr>
				</table>
				<hr>
				<table class="descriptor">
					<tr>
						<td style="padding-right:12px">
							sorted by parameter
						</td>
						<td>
							<table class="content" style="width:100%">
								<tr>
									<th class="content">score</th>
									<th class="content">alt</th>
								</tr>
								<tr>
									<td class="content">>2600</td>
									<td class="content">>42</td>
								</tr>
								<tr>
									<td class="content">>900</td>
									<td class="content"></td>
								</tr>
							</table>    
						</td>
					</tr>
				</table>
				<hr>
				<h2> Example values for generated tests </h2>
				<table class="content" style="width:50%">
					<tr>
					<th class="content">score</th>
					<th class="content">alt</th>
					<th class="content">set name to enable generation</th>
					</tr>
					<tr>
					<td class="content">100</td>
					<td class="content">200</td>
					<td class="content"><input type="text" placeholder="..." style="width:97.5%"></td>
					</tr>
					<tr>
					<td class="content">100</td>
					<td class="content">200</td>
					<td class="content"><input type="text" placeholder="..." style="width:97.5%"></td>
					</tr>
					<tr>
					<td class="content">100</td>
					<td class="content">200</td>
					<td class="content"><input type="text" placeholder="..." style="width:97.5%"></td>
					</tr>
				</table>    
				<button>Generate Tests</button>
			</body>
			</html>		
		`;
	}

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

	let sendParametersToPopup = vscode.commands.registerCommand('mf.sendParametersToPopup', function () {
		//TODO: 
			const functionName = "bonus";
		//TODO: 
			const returnType : string = "int";
		//TODO: 
			const parameterNames : string[] = ["score", "alt"];
		//TODO: 
			const parameterTypes : string[] = ["int", "int"];
		//TODO: 
			const fullConditions : string[]= ["score > 2600", "alt > 42 && score > 900"];
		//TODO: 
		const singleConditions : string[][]= [["score", ">", "2600"], ["alt", ">", "42"], ["score", ">", "900"]];
		//TODO: 
		const calculatedCases : string[][] = [];
		
		// open window next to coding area
		const panel = openPopup(functionName);
		// HTML content of the popup
        const htmlContent = getWebviewContent(functionName, returnType, parameterNames, parameterTypes, fullConditions, singleConditions, calculatedCases);
        // set HTML content of hte Webview-Panel
        panel.webview.html = htmlContent;
	});
	context.subscriptions.push(sendParametersToPopup);
}

// This method is called when your extension is deactivated
export function deactivate() {}
