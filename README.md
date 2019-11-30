# VSCode-Beancount

VSCode extension for the text-based double-entry accounting tool [Beancount](http://furius.ca/beancount/)

[![version](https://vsmarketplacebadge.apphb.com/version-short/Lencerf.beancount.svg)](https://marketplace.visualstudio.com/items?itemName=Lencerf.beancount)
[![ratings](https://vsmarketplacebadge.apphb.com/rating-star/Lencerf.beancount.svg)](https://marketplace.visualstudio.com/items?itemName=Lencerf.beancount#review-details)
[![installs](https://vsmarketplacebadge.apphb.com/installs-short/Lencerf.beancount.svg)](https://marketplace.visualstudio.com/items?itemName=Lencerf.beancount)
[![license](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://raw.githubusercontent.com/Lencerf/vscode-beancount/master/LICENSE.txt)
[![Build Status](https://travis-ci.org/Lencerf/vscode-beancount.svg?branch=master)](https://travis-ci.org/Lencerf/vscode-beancount)
[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)

## Features

1. Syntax highlight (syntax file from [draug3n/sublime-beancount](https://github.com/draug3n/sublime-beancount/blob/master/beancount.tmLanguage))
2. Decimal point alignment
3. Auto-completion of account names, payees, and narrations
4. Auto balance checking after saving files
5. Hovers with account balances.
6. Code snippets ([@vlamacko](https://github.com/Lencerf/vscode-beancount/pull/7))
7. Region folding - use indentation ([#5](https://github.com/Lencerf/vscode-beancount/issues/5)), or special comments ([#11](https://github.com/Lencerf/vscode-beancount/pull/11))
8. (Experimental) Use Pinyin initial letters to input existing Chinese narrations and payees quickly. 使用拼音首字母快速输入现有的中文受款人和描述。[See details](https://github.com/Lencerf/vscode-beancount/blob/master/InputMethods.md).

## Extension Settings

This extension contributes the following settings:

* `beancount.separatorColumn`: specify the column of the decimal separator.
* `beancount.instantAlignment`: Set it to `true` to align the amount (like 1.00 BTC) once a decimal point is inserted.
* `beancount.mainBeanFile`: If you are splitting beancount files into multiple files, set this value to either the full path or the relative path to your main bean file so that
this extension can get all account information. If it is left blank, the extension will consider the file in the current
window as the main file.
* `beancount.runFavaOnActivate`: If it is set to `true`, [fava](https://github.com/beancount/fava) will run once this extension is activated.
* `beancount.inputMethods`: List the input methods for auto-completion of payees and narrations with CJK characters. Currently only `pinyin` is supported. [See details](https://github.com/Lencerf/vscode-beancount/blob/master/InputMethods.md).

## Recommended practices

1. Split your ledger into several `.bean` files according to time and 
put all your `open`/`close` in a main file. 
2. Include all other files in the 
main file by the `include` command in the main bean file.
3. Open `BeanFolder` with VSCode and set `beancount.mainBeanFile` to the full path of `main.bean` in the current [Workspace Settings](https://code.visualstudio.com/docs/getstarted/settings).

For example, the file structure of your directory looks like this
```
BeanFolder
├── .vscode
│   └── settings.json
├── main.bean
├── before2017.bean
├── 2017-01.bean
└── 2017-02.bean
```
If you open `.vscode/settings.json`, you should see something like this:
```json
{
    "beancount.mainBeanFile": "main.bean"
}
``` 

Now once `BeanFolder` is opened as a workspace in VSCode, this extension will be able to invoke beancount to check errors and calculate balances.

## Known Issues

see GitHub [issue page](https://github.com/Lencerf/vscode-beancount/issues)

## Release Notes

### 0.5.2
* Fixed a bug related to completing the first transaction

### 0.5.0
* Use Pinyin initial letters to input existing Chinese narrations and payees quickly.
* auto completion of narrations and payees now is triggered by `"`.

### 0.4.2
* Support relative path to python (to allow wrapper scripts) [@vizanto](https://github.com/Lencerf/vscode-beancount/pull/27).
* Syntax Highlight Enhancement [@SEIAROTg](https://github.com/Lencerf/vscode-beancount/pull/28).