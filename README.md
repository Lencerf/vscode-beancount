# Beancount

Simple Beancount support for VSCode

## Features

1. Syntax highlight (syntax file from [draug3n/sublime-beancount](https://github.com/draug3n/sublime-beancount/blob/master/beancount.tmLanguage))
2. Decimal point alignment
3. Insert current Date
4. Auto check after saving

## Extension Settings

This extension contributes the following settings:

* `beancount.separatorColumn`: specify the column of the decimal separator.
* `beancount.instantAlignment`: Set to `true` to align the amount (like 1.00 BTC) once a decimal point is inserted.
* `beancount.mainBeanFile`: If you are splitting beancount files into multiple files, then specify this option so that
this extension can get all account information. If it is left blank, the extension will consider the file in the current
window as the main file.

## Known Issues

To be found...

## Release Notes

### 0.1.1

The extension now will not check unrelated files. [#8](https://github.com/Lencerf/vscode-beancount/issues/8)

### 0.1.0

Automatically check bean file and show errors in VSCode.

### 0.0.3

Add wordPattern regex to improve autocompletion. [@dcyoung05](https://github.com/Lencerf/vscode-beancount/pull/6)

### [More](https://github.com/Lencerf/vscode-beancount/blob/master/CHANGELOG.md)
