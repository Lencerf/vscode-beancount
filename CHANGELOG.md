## Change Log

### 0.6.0 (2021-03-26)
* Add/remove diagnostic information when standalone files are opened/closed
* Let formatter ignore non-beancount files

### 0.5.6 (2020-03-18)
* fix [#40](https://github.com/Lencerf/vscode-beancount/issues/40)

### 0.5.5 (2020-03-18)
* fix [#38](https://github.com/Lencerf/vscode-beancount/issues/38): account autocompletion fails due to commodity price error

### 0.5.4 (2020-03-14)
* workaround for completing narrations and payees

### 0.5.3 (2020-03-11)
* feat(syntax): add support for beancount_oneliner [@Akuukis](https://github.com/Lencerf/vscode-beancount/pull/36)

### 0.5.2 (2019-11-30)
* Fixed a bug related to completing the first transaction

### 0.5.0 (2019-09-23)
* Use Pinyin initial letters to input existing Chinese narrations and payees quickly.
* auto completion of narrations and payees now is triggered by `"`.

### 0.4.2 (2019-09-16)
* Support relative path to python (to allow wrapper scripts) [@vizanto](https://github.com/Lencerf/vscode-beancount/pull/27).
* Syntax Highlight Enhancement [@SEIAROTg](https://github.com/Lencerf/vscode-beancount/pull/28).

### 0.4.1 (2019-07-13)
* Ensure accounts in transaction can start with all letters [@jumoel](https://github.com/Lencerf/vscode-beancount/pull/23).
* Add an option to disable autocompletion of payee and narration fields.
* Make formatter aware of language specific tabSize settings [@sevenkplus](https://github.com/Lencerf/vscode-beancount/pull/21).

### 0.4.0 (2019-06-17)
* Add support for non-ascii characters in account names [@lockjs](https://github.com/Lencerf/vscode-beancount/pull/19)
* Add "flag as okay" quickfix for flag warnings [@mjec](https://github.com/Lencerf/vscode-beancount/pull/18)

### 0.3.4, 0.3.5 (2019-02-18)
* Fix a bug in auto-completion of links(^)
* auto-completion improvements

### 0.3.3 (2019-01-13)
* Auto-completion of tags and links

### 0.3.2 (2019-01-05)
* Recognize indented directives. [@zahanm](https://github.com/Lencerf/vscode-beancount/pull/15)
* Fix the bug that only one commodity is shown in the hover.

### 0.3.1 (2019-01-02)
* Fix path problem on Windows
* Add logs
* other minor improvements

### 0.3.0 (2018-12-16)
* Auto-completion lists now include accounts, payees, and narrations appeared in other files.
* Hover over account names to check account balances.
* Remove command `beancount.insertDate`, which is replaced by auto-completion.
* Temporarily remove `beancount.alignCommodity`.

### 0.2.8 (2018-11-15)
* Add accented characters support in wordPattern regex. [@NicolasP](https://github.com/Lencerf/vscode-beancount/pull/13)

### 0.2.7 (2018-10-07)
* Fix a bug where the cursor is not correctly moved

### 0.2.6 (2018-09-19)
* Provide options to specify python3 and fava path [#12](https://github.com/Lencerf/vscode-beancount/issues/12)

### 0.2.5 (2018-09-09)
* Fix a bug where the cursor is not correctly moved
* Change Fava binding address to 127.0.0.1

### 0.2.4 (2018-08-15)
* Fix a bug where duplicate diagnostic entries show up
* Add code folding markers ([@zacharylawrence](https://github.com/Lencerf/vscode-beancount/pull/11))

### 0.2.3 (2018-05-17)
* Correctly handle terminal-close event.

### 0.2.2 (2018-05-17)
* Fix some potential bugs;
* `beancount.mainBeanFile` now cen be set to either a relative path or a full path. ([@robotkid](https://github.com/Lencerf/vscode-beancount/pull/10))

### 0.2.1 (2018-05-06)
* Fix a bug related to an empty contentChanges array. ([@robotkid](https://github.com/Lencerf/vscode-beancount/pull/9))

### 0.2.0 (2018-04-26)

- Code snippets ([@vlamacko](https://github.com/Lencerf/vscode-beancount/pull/7))
- Run Fava to view balances 

### 0.1.1 (2018-04-22)
- The extension now will not check unrelated files. [#8](https://github.com/Lencerf/vscode-beancount/issues/8)

### 0.1.0 (2018-01-24)
- Automatically check bean file and show errors in VSCode.

### 0.0.3 (2018-01-14)
- Add wordPattern regex to improve autocompletion. [@dcyoung05](https://github.com/Lencerf/vscode-beancount/pull/6)

### 0.0.2 (2017-04-15)
- Made the extension honor editor.tabSize when inserting new postings

### 0.0.1 (2017-03-14)
- Initial release