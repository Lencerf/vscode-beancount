# Beancount

Simple [Beancount](http://furius.ca/beancount/) support for VSCode

[![version](https://vsmarketplacebadge.apphb.com/version-short/Lencerf.beancount.svg)](https://marketplace.visualstudio.com/items?itemName=Lencerf.beancount)
[![ratings](https://vsmarketplacebadge.apphb.com/rating-star/Lencerf.beancount.svg)](https://marketplace.visualstudio.com/items?itemName=Lencerf.beancount#review-details)
[![installs](https://vsmarketplacebadge.apphb.com/installs-short/Lencerf.beancount.svg)](https://marketplace.visualstudio.com/items?itemName=Lencerf.beancount)
[![license](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://raw.githubusercontent.com/Lencerf/vscode-beancount/master/LICENSE.txt)


## Features

1. Syntax highlight (syntax file from [draug3n/sublime-beancount](https://github.com/draug3n/sublime-beancount/blob/master/beancount.tmLanguage))
2. Decimal point alignment
3. Auto-completion of account names, payees, and narrations
4. Auto balance checking after saving files
5. Hovers with account balances.
6. Code snippets ([@vlamacko](https://github.com/Lencerf/vscode-beancount/pull/7))

## Extension Settings

This extension contributes the following settings:

* `beancount.separatorColumn`: specify the column of the decimal separator.
* `beancount.instantAlignment`: Set it to `true` to align the amount (like 1.00 BTC) once a decimal point is inserted.
* `beancount.mainBeanFile`: If you are splitting beancount files into multiple files, set this value to either the full path or the relative path to your main bean file so that
this extension can get all account information. If it is left blank, the extension will consider the file in the current
window as the main file.
* `beancount.runFavaOnActivate`: If it is set to `true`, [fava](https://github.com/beancount/fava) will run once this extension is activated.

## Recommended practices

Split your ledger into several `.bean` files according to time and 
put all your `open`/`close` in a main file. Include all other files in the 
main file by the `include` command. For example, the file structure looks like this
```
BeanFolder
├── .vscode
│   └── settings.json
├── main.bean
├── before2017.bean
├── 2017-01.bean
└── 2017-02.bean
```
Open `BeanFolder` with VSCode and set `beancount.mainBeanFile` to the full path of `main.bean` in the current [Workspace Settings](https://code.visualstudio.com/docs/getstarted/settings). That means if you
open `.vscode/settings.json`, you should see something like this:
```json
{
    "beancount.mainBeanFile": "main.bean"
}
``` 

Now once `BeanFolder` is opened as a workspace in VSCode, this extension will be able to invoke beancount to check errors and calculate balances.

## Known Issues

see GitHub [issue page](https://github.com/Lencerf/vscode-beancount/issues)

## Release Notes

### 0.3.1
* Fix path problem on Windows
* Add logs
* other minor improvements

### 0.3.0
* Auto-completion lists now include accounts, payees, and narrations appeared in other files.
* Hover over account names to check account balances.
* Remove command `beancount.insertDate`, which is replaced by auto-completion.
* Temporarily remove `beancount.alignCommodity`.

### 0.2.8
* Add accented characters support in wordPattern regex. [@NicolasP](https://github.com/Lencerf/vscode-beancount/pull/13)

