/**
 * This is a VsCode Extension that aids users to create viable JUnit tests. It provides a new context menu option when right clicking 
 * the declaration of a function. The Extension is made by Alex Edich and was part of a student project for the HSBI in Bielefeld, Germany
 */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import ts, { SyntaxKind } from 'typescript';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	//MARK: Trigger function visibility
	//Show command sendParametersToPopup only on function names
	vscode.window.onDidChangeTextEditorSelection(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {            
			//const selectedText = editor.document.lineAt(editor.selection.active.line);
            if (isFunctionNameSelected()) {
                // only show function in context menu, if function declaration line is selected
				//console.log('Funktionsname ausgewählt!');
                vscode.commands.executeCommand('setContext', 'mctg.contextOptionVisible', true);
            } else {
				//console.log('Funktionsname nicht ausgewählt!');
                vscode.commands.executeCommand('setContext', 'mctg.contextOptionVisible', false);
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
			//return true, when line contains public keyword
			return selectedTextLine.includes("public");
		}
	}

	//MARK: read code

	function readMethodContent() : [string, string, string[], string[], string[]] {
		//these will be sent to the popup
		let returnType : string = "";
		let functionName : string = "";
		let parameterNames : string[] = [];
		let parameterTypes : string[] = [];
		let fullConditions : string[] = [];
		//get editor
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			//read entire line at the selection cursor
			const selectedTextLine = editor.document.lineAt(editor.selection.active.line).text;
			//prepare scanner
			const scanner = ts.createScanner(ts.ScriptTarget.Latest, false);
			scanner.setText(selectedTextLine);
			//token expected to be public
			scanner.scan();
			let token = scanner.getToken();
			while (token !== ts.SyntaxKind.PublicKeyword) {
				scanner.scan();
				token = scanner.getToken();
				if (scanner.getToken() === ts.SyntaxKind.EndOfFileToken) {
					console.error("expected line to begin with keyword public");
					return ["", "", [], [], []];
				}
			}
			//skip whitespace token
			scanner.scan();
			//token expected to be data type (void, int, etc.)
			scanner.scan();
			returnType = scanner.getTokenText();
			//skip whitespace token
			scanner.scan();
			//token expected to be function name
			scanner.scan();
			functionName = scanner.getTokenText();
			//token expected to be "("
			scanner.scan();
			if (scanner.getTokenText() !== "(") {
				throw new Error("Error: This is not a method");
			}
			scanner.scan();
			//error case, if method does not have parameters
			if (scanner.getTokenText() === ")") {
				throw new Error("Error: This method does not have any parameters");
			}
			//build string out of content in parentheses	
			while (scanner.getTokenText() !== ")") {
				//first scan skips "," and " ". then add type
				parameterTypes.push(scanner.getTokenText());
				//skip whitespace token
				scanner.scan();
				//add name
				scanner.scan();
				parameterNames.push(scanner.getTokenText());
				//jump to either ")" or ","
				scanner.scan();
				//skip ", "
				if (scanner.getTokenText() === ",") {
					scanner.scan();
					scanner.scan();
				}
			}
			//skip ")"
			scanner.scan();
			//find token position
			let startLine = editor.selection.active.line;
			let startChar = scanner.getTokenStart();	
			let startPos = new vscode.Position(startLine, startChar);
			//find end of document
			const documentEnd = editor.document.lineAt(editor.document.lineCount - 1).range.end;
			const docRest = editor.document.getText(new vscode.Range(startPos, documentEnd));
			//put rest into scanner
			scanner.setText(docRest);
			//skip to "{"
			do {
				scanner.scan();
			} while (scanner.getTokenText() !== "{");
			//count "{" and "}" until all are closed or at end of file. search "if" inside
			let bracketCounter = 0;
			do {
				//layer up or down
				if (scanner.getTokenText() === "{") {
					bracketCounter++;
				} else if (scanner.getTokenText() === "}") {
					bracketCounter--;
				//if statement found
				} else if (scanner.getTokenText() === "if") {
					//skip over "("
					while (scanner.getTokenText() !== "(") {
						scanner.scan();
					}
					let statement = "";
					//skip to next token
					scanner.scan();
					//push tokens until token ")"
					do {
						statement += scanner.getTokenText();
						scanner.scan();
					} while (scanner.getTokenText() !== ")");
					fullConditions.push(statement);
				}
				scanner.scan();
			} while (bracketCounter !== 0 && scanner.getToken() !== ts.SyntaxKind.EndOfFileToken);
		}
		return [returnType, functionName, parameterTypes, parameterNames, fullConditions];
	}
	
	//MARK: popup and table generation
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
			{
				enableScripts: true // Necessary to execute scripts by pressing the button
			}
		);
		return panel;
	}

	/**
	 * Table showing all avaiable parameters
	 * @param parameterNames 
	 * @returns 
	 */
	function createParameterNameTable(parameterTypes : string[], parameterNames : string[]) : string {
		let parameterTable : string = `
			<td>
				parameters
			</td>
			<td>
				<table class="content">
					<tr>					
		`;
		for(let i = 0; i < parameterNames.length; i++) {
			parameterTable += `
						<td class="content">` + parameterTypes[i] + ` ` + parameterNames [i] + `</td>
			`;
		}
		parameterTable += `
					</tr>
				</table>    
			</td>
		`;
		return parameterTable;
	}

	/**
	 * Table showing full conditions inside certain statements
	 * @param fullConditions 
	 * @returns 
	 */
	function createFullConditionsTable(fullConditions : string[]) : string {
		let fullConditionsTable : string  = `
			<td>
				full conditions
			</td>
			<td>
				<table class="content">
					<tr>	
		`;
		for(let i = 0; i < fullConditions.length; i++) {
			fullConditionsTable += `
						<td class="content">` + fullConditions[i] + `</td>
			`;
		}
		fullConditionsTable += `
					</tr>
				</table>    
			</td>
		`;
		return fullConditionsTable;
	}
	
	/**
	 * Table showing all full conditions split up into single conditions
	 * @param singleConditions 
	 * @returns 
	 */
	function createSingleConditionsTable(singleConditions : string[][]) : string {
		let singleConditionsTable : string  = `
			<td>
				single conditions
			</td>
			<td>
				<table class="content">
					<tr>	
		`;
		for(let i = 0; i < singleConditions.length; i++) {
			singleConditionsTable += `<td class="content">` + singleConditions[i][0];
			for(let j = 1; j < singleConditions[i].length; j++) {
				singleConditionsTable += ` ` + singleConditions[i][j];
			}
			singleConditionsTable +=`</td>`;
		}
		singleConditionsTable += `
					</tr>
				</table>    
			</td>
		`;
		return singleConditionsTable;
	}

	/**
	 * Table showing all condition values sorted by variable
	 * @param parameterNames 
	 * @param singleConditions 
	 * @returns 
	 */
	function createSortedValuesTable(parameterNames : string[], sortedValues : string[][][]) : string {
		//determine longest column to know amount of rows needed
		let longestColumn = 0;
		sortedValues.forEach(column => {
			if (column.length > longestColumn) {
				longestColumn = column.length;
			}
		});
		//td containing table
		let sortedValuesTable : string = ` 
			<td style="padding-right:12px">
				sorted by parameter
			</td>
			<td>
				<table class="content">`;
		//add every row to table
		for(let y = 0; y < longestColumn; y++) {
			sortedValuesTable += `<tr>`;
			//add every cell to row
			for(let x = 0; x < parameterNames.length; x++) {
				//first line is header cells with parameter names
				if (y === 0) {
					sortedValuesTable += `<th class="content">` + sortedValues[x][0][0] + `</th>`;
				//other lines are parameter values
				} else {
					sortedValuesTable += `<td class="content">`;
					//add operator + value to cell
					if ((sortedValues[x].length > y)) {
						sortedValues[x][y].forEach(conditionToken => {
							sortedValuesTable += conditionToken + ` `;
						});
					}
					sortedValuesTable += `</td>`;
				}
			}
			sortedValuesTable += `</tr>`;
		}
		sortedValuesTable += `
				</table>    
			</td> 
		`;
		return sortedValuesTable;
	}

	function createTruthTable(sortedValues : string[][][], fullTruthTable : [boolean[], ValueRange[][]][], possibleCases : number[]) : string {
		const checkmark = `<span>&#10003;</span>`;
		const cross = `<span>&#10007;</span>`;
		let table = `<table class="content">
						<tr>
		`;
		//add column headers. Read conditions of all parameters
		sortedValues.forEach(parameterConditions => {
			//read tokens of all conditions of this parameter
			for (let conditionCell = 1; conditionCell < parameterConditions.length; conditionCell++) {
				//combine all tokens of the condition to a single string
				let condition : string = parameterConditions[0][0];
				parameterConditions[conditionCell].forEach(token => {
					condition += ` ` + token;
				});
				//add header
				table += `	<th class="content">` + condition + `</th>`;
			}
		});
		//add validation columns
		table += `			<th class="content" style="border-left-width:3px">Possible?</th>
							<th class="content">Case Num</th>
						</tr>
		`;
		//create a row for every test case
		for (let testCase = 0; testCase < fullTruthTable.length; testCase++) {
			table += `	<tr>`;
			//add checkmark or cross to every condition
			for (let condition = 0; condition < fullTruthTable[0][0].length; condition++) {
				table += `	<td class="content">` + (fullTruthTable[testCase][0][condition] ? checkmark : cross) + `</td>`;
			}
			//mark if test case is possible
			table += `		<td class="content" style="border-left-width:3px">` + (possibleCases.includes(testCase) ? checkmark : cross) + `</td>`;
			table += `		<td class="content">` + (possibleCases.includes(testCase) ? possibleCases.indexOf(testCase)+1 : ``) + `</td>`;
			table += `	</tr>`;
		}
		table += `	</table>`;
		return table;
	}

	function createCaseCreationTable(parameterNames : string[], fullTruthTable : [boolean[], ValueRange[][]][], possibleCases : number[]) : string {
		let inputNum = 0;
		let table = `	<table class="content">
							<tr>
								<th class="content">case</th>
		`;
		//create headers
		parameterNames.forEach(parameter => {
			table += `			<th class="content">` + parameter + `</th>`;
		});
		table += `				<th class="content">set name to enable generation</th>
							</tr>
		`;
		//create row for each possible case
		for (let caseNum = 0; caseNum < possibleCases.length; caseNum++) {
			table += `		<tr>
								<td class="content">` + (caseNum+1) + `</td>`;
			for (let parameter = 0; parameter < parameterNames.length; parameter++) {
				let previewInput : string = "";
				fullTruthTable[possibleCases[caseNum]][1][parameter].forEach(range => {
					previewInput += range.toString();
				});
				table += `		<td class="content"> <input type="text" id="input${inputNum++}" placeholder="` + previewInput + `"</td>`;
			}
			table += `			<td class="content"><input type="text" id="input${inputNum++}" placeholder="..."></td>
							</tr>`;
		}
		table += `		</table>`;
		return table;
	}

	//MARK: popup table calculation

	function conditionToTokens(condition : string) : string[] {
		let tokens : string[] = [];
		let token = "";
		for (let letter = 0; letter < condition.length; letter++) {
			const currentChar = condition.charAt(letter);
			if (currentChar !== " ") {
				token += currentChar;
			} else {
				tokens.push(token);
				token = "";
			}
		}
		//also add last token after string end
		tokens.push(token);
		return tokens;
	}

	function allFullConditionsToTokens(fullConditions : string[]) : string[][] {
		let conditionTokens : string[][] = [];
		fullConditions.forEach(fullCondition => {
			conditionTokens.push(conditionToTokens(fullCondition));
		});
		return conditionTokens;
	}

	function splitMultiToSingleCondition(fullConditionTokens : string[]) : string[][] {
		let singleConditions : string[][] = [];
		let currentCondition = 0;
		let currentConditionTokens : string[] = [];
		for (let index = 0; index < fullConditionTokens.length; index++) {
			//if token combines a condition, push upcoming tokens to next array
			if (fullConditionTokens[index] === "&&" || fullConditionTokens[index] === "||") {
				singleConditions.push(currentConditionTokens);
				currentConditionTokens = [];
				currentCondition++;
			//push normal tokens into current condition
			} else {
				currentConditionTokens.push(fullConditionTokens[index]);
			}
		}
		//also add last token after string end
		singleConditions.push(currentConditionTokens);
		return singleConditions;
	}

	function splitAllMultiToSingleConditions(fullConditions : string[]) : string[][] { 
		//get all relevant tokens
		const allConditionsAsTokens = allFullConditionsToTokens(fullConditions);
		let singleConditions : string[][] = [];
		//split every condition to single conditions
		allConditionsAsTokens.forEach(conditionTokens => {
			let currentSingleConditions = splitMultiToSingleCondition(conditionTokens);
			//add every single condition to array
			currentSingleConditions.forEach(singleCondition => {
				singleConditions.push(singleCondition);
			});
		});
		return singleConditions;
	}

	/**
	 * 
	 * @param parameterNames does not matter wether parameter is on left or right side of the operator
	 * @param singleConditions ["operator", "value"][* number of single conditions]
	 * @returns [parameterName][condition cell]["operator", "value"]
	 */
	function sortValues(parameterNames : string[], singleConditions : string[][]) : string[][][] {
		let sortedValues : string[][][] = [];
		//fill column for every parameter
		parameterNames.forEach(name => {
			let sortColumn : string[][] = [];
			//add parameter name as column header
			sortColumn.push([name]);
			//add all matching conditions to column
			singleConditions.forEach(condition => {
				//if condition has something to do with this parameter
				if (condition.includes(name)) {
					//condition[1] should always be an operator: < > == !=
					let conditionValue : string[] = [condition[1]];
					//add value. Value is either on the left or right of the condition 
					conditionValue.push((condition[0] === name) ? condition[2] : condition[0]);
					sortColumn.push(conditionValue);
				}
			});
			//end column
			sortedValues.push(sortColumn);
		});
		return sortedValues;
	}

	function findPossibleCases(fullTruthTable : [boolean[], ValueRange[][]][]) : number[] {
		let possibleCases : number[] = [];
		for (let testCase = 0; testCase < fullTruthTable.length; testCase++) {
			let valid : boolean = true;
			fullTruthTable[testCase][1].forEach(parameterRange => {
				if (parameterRange.length === 0) {
					valid = false;
				}
			});
			if (valid) {
				possibleCases.push(testCase);
			}
		}
		return possibleCases;
	}

	/**
	 * Table showing a truth table with all condition combination cases an wether the case is even possible
	 * @param parameterTypes 
	 * @param parameterNames 
	 * @param singleConditions 
	 * @returns 
	 */
	function combineFullTruthTable(parameterTypes : string[], parameterNames : string[], singleConditions : string[][]) : [boolean[], ValueRange[][]][]{
		//generate truth tables for every parameter and combine them
		const sortedValues : string[][][] = sortValues(parameterNames, singleConditions);
		//combine parameters from last to first to keep a nice order
		let fullTruthTable : [boolean[], ValueRange[][]][] = getParameterCombinationRange(
			parameterTypes[parameterNames.length-1], sortedValues[parameterNames.length-1]);
		for (let parameter = parameterNames.length-2; parameter >= 0; parameter--) {
			let parameterTruthTable : [boolean[], ValueRange[][]][] = getParameterCombinationRange(parameterTypes[parameter], sortedValues[parameter]);
			fullTruthTable = combineTruthTables(parameterTruthTable, fullTruthTable);
		}
		return fullTruthTable;
	}

	/**
	 * 
	 * @param table1 [[truth table], [parameters][ValueRanges]][* truth table cases]
	 * @param table2 [[truth table], [parameters][ValueRanges]][* truth table cases]
	 * @returns [[combined truth table], [parameters][ValueRanges]][* truth table cases]
	 */
	function combineTruthTables(table1 : [boolean[], ValueRange[][]][], 
			table2 : [boolean[], ValueRange[][]][]) : 
			[boolean[], ValueRange[][]][] {
		let allCasesWithRanges : [boolean[], ValueRange[][]][] = [];
		for (let case1 = 0; case1 < table1.length; case1++){
			for (let case2 = 0; case2 < table2.length; case2++){
				//push all condition states of both tables into combinedCases
				let combinedCases : boolean[] = [];
				table1[case1][0].forEach(condition => {
					combinedCases.push(condition);
				});
				table2[case2][0].forEach(condition => {
					combinedCases.push(condition);
				});
				//put ranges into parameters
				let parameterRanges : ValueRange[][] = [];
				table1[case1][1].forEach(parameterRange => {
					parameterRanges.push(parameterRange);
				});
				table2[case2][1].forEach(parameterRange => {
					parameterRanges.push(parameterRange);
				});
				allCasesWithRanges.push([combinedCases, parameterRanges]);
			}
		}
		return allCasesWithRanges;
	}
	
	/**
	 * checks all combinations of all conditions for a single parameter and returns whether a possible range exists or not
	 * @param parameterType int, string, etc
	 * @param conditions [cell][cell token] with first cell only containing the parameter name
	 * @returns [[case combination], [only one entry][possible range]][* all cases]. The double-Array will be a helpful tool later
	 */
	function getParameterCombinationRange(parameterType : string, conditions : string[][]) : [boolean[], ValueRange[][]][] {
		//create truth table with all possible combinations
		let truthTable : boolean[][] = []; //[[false, false, false], [false, false, true], ...];
		for(let y = 0; y < Math.pow(2, conditions.length-1); y++) {
			let combination : boolean[] = [];
			for(let x = conditions.length-2; x >= 0; x--) {
				combination.push((Math.floor(y/Math.pow(2, x))%2) === 1);
			}
			truthTable.push(combination);
		}
		//combine each range
		let casesWithRanges : [boolean[], ValueRange[][]][] = [];
		for (let tableCase = 0; tableCase < truthTable.length; tableCase++) {
			let caseRange : ValueRange[] = [new ValueRange(true, -Infinity, Infinity, true)];
			for (let condition = 1; condition < conditions.length; condition++) {
				let conditionRange : ValueRange[] = getRange(conditions[condition], truthTable[tableCase][condition-1]);
				caseRange = getRangeIntersection(parameterType, caseRange, conditionRange);
			}
			casesWithRanges.push([truthTable[tableCase], [caseRange]]);
		}
		return casesWithRanges;
	}

	//MARK: ValueRange

	/**
	 * This class is used to represent an interval of allowed values that fulfil a condition
	 */
	class ValueRange {
		public minEdge!: boolean;
		public start!: number;
		public end!: number;
		public maxEdge!: boolean;
		constructor(minEdge : boolean, start : number, end : number, maxEdge : boolean) {
			this.minEdge = minEdge;
			this.start = start;
			this.end = end;
			this.maxEdge = maxEdge;
		}
		public toString() : string {
			const leftBracket = this.minEdge ? "[" :  "(";
			const rightBracket = this.maxEdge ? "]" :  ")";
			return leftBracket + this.start + ", " + this.end + rightBracket;
		}
	}

	/**
	 * 
	 * @param datatype any number type
	 * @param condition [operator, value]
	 * @returns the possible range of numbers as [minEdgeIncluded, min, max, maxEdgeIncluded]
	 */
	function getRange(condition : string[], isConditionTrue : boolean) : ValueRange[] {
		//+"string" parses to a number
		//no switch case, since javascript compares tuples by reference and not by value
		if ((condition[0] === "<=" && isConditionTrue === true) || (condition[0] === ">" && isConditionTrue === false)) {
			return [new ValueRange(true, -Infinity, +condition[1], true)];
		} else if ((condition[0] === "<" && isConditionTrue === true) || (condition[0] === ">=" && isConditionTrue === false)) {
			return [new ValueRange(true, -Infinity, +condition[1], false)];
		} else if ((condition[0] === ">=" && isConditionTrue === true) || (condition[0] === "<" && isConditionTrue === false)) {
			return [new ValueRange(true, +condition[1], Infinity, true)];
		} else if ((condition[0] === ">" && isConditionTrue === true) || (condition[0] === "<=" && isConditionTrue === false)) {
			return [new ValueRange(false, +condition[1], Infinity, true)];
		} else if ((condition[0] === "==" && isConditionTrue === true) || (condition[0] === "!=" && isConditionTrue === false)) {
			return [new ValueRange(true, +condition[1], +condition[1], true)];
		} else if ((condition[0] === "!=" && isConditionTrue === true) || (condition[0] === "==" && isConditionTrue === false)) {
			return [new ValueRange(true, -Infinity, +condition[1], false), new ValueRange(false, +condition[1], Infinity, true)];
		}
		return [];
	}

	/**
	 * 
	 * @param datatype any number type
	 * @param condition1 [minEdgeIncluded, min, max, maxEdgeIncluded]
	 * @param condition2 [minEdgeIncluded, min, max, maxEdgeIncluded]
	 * @returns intersecting range. [] if no intersection
	 */
	function getRangeIntersection(datatype : string, range1 : ValueRange[], range2 : ValueRange[]) : ValueRange[] {
		switch (datatype) {
			case "int":
			case "double":
			case "short":
			case "long":
			case "uint":
				const intersection: ValueRange[] = [];
				//basic intersection rules in set theory
				for (const ValueRange1 of range1) {
					for (const ValueRange2 of range2) {
						const minEdge = (Math.max(ValueRange1.start, ValueRange2.start) === ValueRange1.start) ? 
							ValueRange1.minEdge : ValueRange2.minEdge;
						const start = Math.max(ValueRange1.start, ValueRange2.start);
						const end = Math.min(ValueRange1.end, ValueRange2.end);
						const maxEdge = (Math.min(ValueRange1.end, ValueRange2.end) === ValueRange1.end) ? 
							ValueRange1.maxEdge : ValueRange2.maxEdge;
						//skip range, if no valid values are included
						if (start <= end) {
							intersection.push(new ValueRange(minEdge, start, end, maxEdge));
						}
					}
				}
				return intersection;

			default:
				//fail state
				return [];
		}
	}

	//MARK: Popup content

	function getWebviewContent(functionName: string, returnType : string, 
		parameterNames : string[], parameterTypes : string[], 
		fullConditions : string[]) {
		const singleConditions : string[][] = splitAllMultiToSingleConditions(fullConditions);
		const sortedValues = sortValues(parameterNames, singleConditions);
		const truthTable = combineFullTruthTable(parameterTypes, parameterNames, singleConditions);
		const possibleCases = findPossibleCases(truthTable);
		// HTML for the Config view
		return `
			<!DOCTYPE html>
			<html>
			<head>
			<title>Page Title</title>
			</head>
			<style>
				table.content, td.content, th.content {
					border: 1px solid DimGray;
					border-collapse: collapse;
				}
				th, td {
					padding: 2px;
					padding-left: 5px;
					padding-right: 5px;
					text-align: center;
				}
				input {
					color: LightGray;
					background-color: #2A2A2A;
				}
			</style>
			<body>
				<h1>Multiple Condition Test Generator</h1>
				<h2>Creating tests for function: ` + returnType + ` ` + functionName + ` </h2>
				<hr>
				<table class="descriptor">
					<tr>
						` + createParameterNameTable(parameterTypes, parameterNames) + `
					</tr>
					<tr>
						` + createFullConditionsTable(fullConditions) + `
					</tr>
					<tr>
						` + createSingleConditionsTable(singleConditions) + `
					</tr>
				</table>
				<hr>
				<table class="descriptor">
					<tr>
						` + createSortedValuesTable(parameterNames, sortedValues) + `
					</tr>
				</table>
				<hr>
				<h2> Possible conditional combinations </h2>
					` + createTruthTable(sortedValues, truthTable, possibleCases) + `
				<hr>
				<h2> Select possible values to generate tests </h2>
					` + createCaseCreationTable(parameterNames, truthTable, possibleCases) + `
				<h2> </h2>
				<button id="generateButton">Generate Tests</button>
				<script>
					(function() {
						const vscode = acquireVsCodeApi();
						document.getElementById('generateButton').addEventListener('click', () => {
							const inputs = [];
							for (let i = 0; i < ${possibleCases.length * (parameterNames.length+1)}; i++) {
								inputs.push(document.getElementById('input' + i).value);
							}
							vscode.postMessage({ command: 'createTestFile', inputs: inputs });
						});
					})();
				</script>
				<h2> </h2>
			</body>
			</html>		
		`;
	}

	//MARK: Command: Debug Start
	vscode.window.showInformationMessage('The extension is now active!');

	let disposable = vscode.commands.registerCommand('mctg.debugStart', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		//vscode.window.showInformationMessage('The extension is now active!');
	});
	context.subscriptions.push(disposable);

	//MARK: Command: Sample Code
	let createSampleCode = vscode.commands.registerCommand('mctg.createSampleCode', function () {
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
		vscode.window.showInformationMessage('The extension is now active!');
	});
	context.subscriptions.push(createSampleCode);

	//MARK: Command: Popup
	let sendParametersToPopup = vscode.commands.registerCommand('mctg.sendParametersToPopup', (uri: vscode.Uri) => {
		if (!uri || uri.scheme !== 'file') {
			vscode.window.showErrorMessage('No file seleted');
            return;
		}
		let methodContent : [string, string, string[], string[], string[]] = ["", "" , [], [], []];
		let htmlContent : string = "";
		try {
			methodContent = readMethodContent();
		} catch (error) {
			if (error instanceof Error) {
				htmlContent = error.message;
			}
		}
		
		const returnType : string = methodContent[0];
		const functionName = methodContent[1]; 
		const parameterTypes : string[] = methodContent[2]; 
		const parameterNames : string[] = methodContent[3];
		const fullConditions : string[]= methodContent[4];	
		// open window next to coding area
		const panel = openPopup(functionName);
		// HTML content of the popup
        htmlContent = getWebviewContent(functionName, returnType, parameterNames, parameterTypes, fullConditions);
        // set HTML content of hte Webview-Panel
        panel.webview.html = htmlContent;

		panel.webview.onDidReceiveMessage(async message => {
            if (message.command === 'createTestFile') {
				const inputs : string[] = message.inputs;
                const mainPath = path.dirname(uri.fsPath);
                const relativePath = path.relative(vscode.workspace.rootPath || '', mainPath);
                if (!relativePath.includes('src\\main\\java')) {
                    vscode.window.showErrorMessage('The selected file is outside the folder structure src\\main\\java.');
                    return;
                }

                const testRelativePath = relativePath.replace('src\\main\\java', 'src\\test\\java');
                const testFilePath = path.join(vscode.workspace.rootPath || '', testRelativePath, 
					path.basename(uri.fsPath)).replace("\.java", "Test\.java");

				const singleConditions : string[][] = splitAllMultiToSingleConditions(fullConditions);
				const truthTable = combineFullTruthTable(parameterTypes, parameterNames, singleConditions);
				const possibleCases = findPossibleCases(truthTable);
				const inputsPerCase : number = inputs.length / possibleCases.length;
				let testStrings : string[] = [];
				for (let testCase = 0; testCase < possibleCases.length; testCase++) {
					//only create test if all inputs in row are set
					let isEveryInputSet = true;
					for (let input = (inputsPerCase * testCase); input < (inputsPerCase * (testCase+1)); input++) {
						if (inputs[input] === '') {
							isEveryInputSet = false;
						}
					}
					if (isEveryInputSet) {
						const testName = inputs[(inputsPerCase * (testCase+1))-1];
						const parameterTestValues : string[] = [];
						for (let input = (inputsPerCase * testCase); input < (inputsPerCase * (testCase+1))-1; input++) {
							parameterTestValues.push(inputs[input]);
						}
						const fileNodes = testFilePath.split("\\");
						const testFile = fileNodes[fileNodes.length-1].replaceAll("\.java", "");
						const mainFile = testFile.replace("Test", "");
						const testString : string = createTestString(testName, returnType, functionName, 
							parameterTypes, parameterNames, parameterTestValues, mainFile);
						testStrings.push(testString);
					}
				}
                await createTestFile(testFilePath, testStrings);
                
            }
        }, undefined, context.subscriptions);
	});
	context.subscriptions.push(sendParametersToPopup);
}

//MARK: File generation

function createTestString(testName : string, returnType : string, functionName : string, 
		parameterTypes : string[], parameterNames : string[], parameterTestValues : string[], 
		mainClassName : string) : string {
	let code : string = `
	@Test
	public void ` + testName + `() {`;
	for (let parameter = 0; parameter < parameterNames.length; parameter++) {
		code += `
		` + parameterTypes[parameter] + ` ` + parameterNames[parameter] + ` = ` + parameterTestValues[parameter] + `;`;
	}
	code += `
		` + returnType + ` result = ` + mainClassName + "\." + functionName + `(`;
	for (let parameter = 0; parameter < parameterNames.length; parameter++) {
		code += parameterNames[parameter] + (parameter !== parameterNames.length-1 ? `, ` : ``);
	}
		
	code +=	`);
	Assert.fail("TODO: Create an assertion for an expected result. ");
	}
	`;
	return code;
}

async function createTestFile(testFilePath: string, testStrings : string[]) {
    const testDir = path.dirname(testFilePath);

    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }

	let tests : string = "";
	testStrings.forEach(element => {
		tests += element;
	});

    if (!fs.existsSync(testFilePath)) {
		const fileNodes = testFilePath.split("\\");
		const testFile = fileNodes[fileNodes.length-1].replaceAll("\.java", "");
		const mainFile = testFile.replace("Test", "");
		const classString = 
`//Auto-Generated
import org.junit.Assert;
import org.junit.Test;
public class ${testFile} {
	${mainFile} ${mainFile} = new ${mainFile}();
	${tests}
}`;
        fs.writeFileSync(testFilePath, classString);
		vscode.window.showInformationMessage(`Test file created: ${testFilePath}`);
    } else {
		fs.writeFileSync(testFilePath, tests);
        vscode.window.showWarningMessage('The file already exists ');
    }
}

// This method is called when your extension is deactivated
export function deactivate() {}
