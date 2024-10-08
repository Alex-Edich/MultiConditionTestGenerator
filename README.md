# mctg README

This is the Multiple Condition Test Generator, or "mctg" for short. This Extension provides useful tools to easily create JUnit tests with ideal code coverage.

## Features

* New options in the context menu (right-click). First, press "DEBUG: Start". Then, right-click on a function  head. The option "Generate Test Cases" will appear.
* Analysis of a given function. List important details and provide truth tables in a seperate window for usable test cases.
* Suggests input values for the function parameters. Set a suggested value and give the test case a name to prepare it for automatic generation.
* Start the test generation to automatically create a test class with a parallel path to the main class and add all prepared test cases as runable tests into the class.

## Requirements

Your Java directory needs to include hamcrest-core and junit inside the lib folder. Suggested versions that were used for development:
* hamcrest-core-1.3.jar:    https://mvnrepository.com/artifact/org.hamcrest/hamcrest-core/1.3
* junit-4.13.2.jar          https://mvnrepository.com/artifact/junit/junit/4.13.2

## How to Execute the extension

Since this is an unpublished in-development extension, you need to execute the extension directory. To properly use the extension, follow these steps:
* Press F5. A selection menu will appear at the top of this VsCode window.
* Select "VS Code Extension Development (preview)". A new window will open, in which you can use the extension.
* Go to the new window and select a Java Program of your choice and open it at its root directory. This directory needs to fulfill the requirements listed above.
    > Note: Alternatively you can create a new Java class, then right-click and select "DEBUG: Create Sample Code" to create a simple function. However, without
      including the jar files, the tests created by the extension will not be executable and will be marked as an error.
* The detection of the cursor position will not work immediately. To activate it, right-click anywhere in the code and select "DEBUG: Start" in the context menu.
    > Note: The Start function is empty. It does nothing besides starting the extension, thus activating all of its update functions.
* After starting the extension, you can right-click on the funcion on a function head code line to see the new option "Generate Test Cases" in the context menu.
* Selecting this option will open a new side window. It will list various details of the selected function in different tables:
    * Function parameters with data type and all conditions inside if-statements, as well as every single condition inside compound conditions using "&&" or "||".
    * All parameter values inside any conditions, sorted by the parameter.
    * A thruth table for all single contitions, including a check if the case is even possible (e.g. x < 10 && x > 20) and assigns a case number to all possible cases.
    * A table with various input fields for all possible cases. The parameter fields show all possible values as placeholder text. A case will only be generated if a name 
      is set.
* Press the button "Generate Tests" to create JUnit tests for all desired test cases. The tests will include the given parameter values.
* The test class will automatically open and all generated tests are visible. These tests contain placeholder assertions that will always fail. It is up to the user to 
  replace these with fitting assertions.
    > Note: if the test class already exists, newly generated tests will be included inside the class.
* You can run your Tests by clicking the green triangle next to the test function. Alternatively, you can right-click the triangle and select "run with coverage" in the
  context menu to analyse, how much percent of code lines in the main class are executed by at least one test function.

## Known issues

This includes known bugs, as well as features, that would be fitting for this extension. These issues can be a focus of the continuation of this project.
* The truth table should also consider compound conditions to actually make it a "multiple condition test" generator
* Inputs were only tested with integer values. Non-number types, as well es complex types like "String" or custom classes may be added.
* The input of parameter test values allows any input. The generation button should be disabled, when the input is an invalid format or out of bounds.
* only the content in brackets of "if" statements are read by the extension. Other statements, like "switch" or "while" may be included.

## Release notes:

### 0.1.0

Publication of the extension as a study by A.Edich and B.Pekcan

##### ORIGINAL #####

**Enjoy!**
# MultiConditionTestGenerator