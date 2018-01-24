# Beancount

Simple Beancount support for VSCode

## Features

1. Syntax highlight (syntax file from [draug3n/sublime-beancount](https://github.com/draug3n/sublime-beancount/blob/master/beancount.tmLanguage))
2. Decimal point alignment
3. Insert current Date

## Extension Settings

This extension contributes the following settings:

* `beancount.separatorColumn`: specify the column of the decimal separator.
* `beancount.instantAlignment`: Set to `true` to align the amount (like 1.00 BTC) once a decimal point is inserted.

## Known Issues

To be found...

## Release Notes

### 0.1.0

Automatically check bean file and show errors in VSCode.

### 0.0.3

Add wordPattern regex to improve autocompletion. [@dcyoung05](https://github.com/Lencerf/vscode-beancount/pull/6)

### 0.0.2

Made the extension honor editor.tabSize when inserting new postings
