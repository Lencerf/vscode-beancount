## Change Log

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