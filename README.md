# VSCode-Beancount

VSCode extension for the text-based double-entry accounting tool
[Beancount](http://furius.ca/beancount/)

[![version](https://img.shields.io/visual-studio-marketplace/v/Lencerf.beancount)](https://marketplace.visualstudio.com/items?itemName=Lencerf.beancount)
[![downloads](https://img.shields.io/visual-studio-marketplace/d/Lencerf.beancount)](https://vsmarketplacebadge.apphb.com/downloads-short/Lencerf.beancount.svg)
[![installs](https://img.shields.io/visual-studio-marketplace/i/Lencerf.beancount)](https://marketplace.visualstudio.com/items?itemName=Lencerf.beancount)
[![rating](https://img.shields.io/visual-studio-marketplace/r/Lencerf.beancount)](https://marketplace.visualstudio.com/items?itemName=Lencerf.beancount)
[![license](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://raw.githubusercontent.com/Lencerf/vscode-beancount/master/LICENSE.txt)

> [!IMPORTANT]
>
> Looking for maintainers! If you are interested in helping review and merge PRs
> from the community, checkout
> [#122](https://github.com/Lencerf/vscode-beancount/discussions/122).

## Features

1. Syntax highlight (syntax file from
   [draug3n/sublime-beancount](https://github.com/draug3n/sublime-beancount/blob/master/beancount.tmLanguage))
2. Decimal point alignment
3. Auto-completion of account names, payees, and narrations
4. Auto balance checking after saving files
5. Hovers with account balances.
6. Code snippets
   ([@vlamacko](https://github.com/Lencerf/vscode-beancount/pull/7))
7. Region folding - use indentation
   ([#5](https://github.com/Lencerf/vscode-beancount/issues/5)), or special
   comments ([#11](https://github.com/Lencerf/vscode-beancount/pull/11)). For
   org-mode style folding see
   [vscode-org-fold](https://marketplace.visualstudio.com/items?itemName=dumbPy.vscode-org-fold)
8. (Experimental) Use Pinyin initial letters to input existing Chinese
   narrations and payees quickly. 使用拼音首字母快速输入现有的中文受款人和描述
   。[See details](https://github.com/Lencerf/vscode-beancount/blob/master/InputMethods.md).

## Extension Settings

This extension contributes the following settings:

- `beancount.separatorColumn`: specify the column of the decimal separator.
- `beancount.instantAlignment`: Set it to `true` to align the amount (like 1.00
  BTC) once a decimal point is inserted.
- `beancount.completePayeeNarration`: Controls whether the auto completion list
  should include payee and narration fields.
- `beancount.mainBeanFile`: If you are splitting beancount files into multiple
  files, set this value to either the full path or the relative path to your
  main bean file so that this extension can get all account information. If it
  is left blank, the extension will consider the file in the current window as
  the main file.
- `beancount.runFavaOnActivate`: If it is set to `true`,
  [fava](https://github.com/beancount/fava) will run once this extension is
  activated.
- `beancount.favaPath`: Specify the path of Fava if Fava is not installed in the
  main Python installation.
- `beancount.python3Path`: Specify the path of Python if beancount is not
  installed in the main Python installation.
- `beancount.fixedCJKWidth`: Set to true to treat CJK aka East Asian characters
  as two letters width on alignment.
- `beancount.inputMethods`: List the input methods for auto-completion of payees
  and narrations with CJK characters. Currently only `pinyin` is supported.
  [See details](https://github.com/Lencerf/vscode-beancount/blob/master/InputMethods.md).

## Recommended practices

0. **Make sure you installed Python3 and
   [beancount](https://pypi.org/project/beancount/). Set `beancount.python3Path`
   to the correct path.**
1. Split your ledger into several `.bean` files according to time and put all
   your `open`/`close` in a main file.
2. Include all other files in the main file by the `include` command in the main
   bean file.
3. Open `BeanFolder` with VSCode and set `beancount.mainBeanFile` to the full
   path of `main.bean` in the current
   [Workspace Settings](https://code.visualstudio.com/docs/getstarted/settings).

For example, the file structure of your directory looks like this

```text
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

Now once `BeanFolder` is opened as a workspace in VSCode, this extension will be
able to invoke beancount to check errors and calculate balances.

## Known Issues

see GitHub [issue page](https://github.com/Lencerf/vscode-beancount/issues)

## Release Notes

### 0.14.0 (2025-10-05)

- fix: path should be relative in include directive
  [@ethan-pw](https://github.com/Lencerf/vscode-beancount/pull/117)
- Inlay hints - support inferring from multiple postings
  [@jonchan51](https://github.com/Lencerf/vscode-beancount/pull/114)
- silence print calls from `loader.load_file`
  [@Francis-Gurr](https://github.com/Lencerf/vscode-beancount/pull/113)
- Differentiate between different transaction flags
  [@Steffo99](https://github.com/Lencerf/vscode-beancount/pull/111)

### 0.13.0 (2024-11-09)

- Add Inlay Hints for last legs of transactions with elided amounts
  [@iamkroot](https://github.com/Lencerf/vscode-beancount/pull/69)

### 0.12.0 (2024-09-15)

- Add support for multi-level code outline from headings
  [@Ev2geny](https://github.com/Lencerf/vscode-beancount/pull/110)
