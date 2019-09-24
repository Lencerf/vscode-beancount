# Input Methods

To help input CJK characters more quickly, version 0.5.0 includes a new feature: use pinyin first letters to input existing narrations and payees.

For example, if in previous postings you have a payee 超市 and today you visit it again. To quickly input this payee, simply press `"` to invoke auto completion and then type in `cs` and it will show up in the auto-completion list:

![pinyin demo](https://raw.githubusercontent.com/Lencerf/vscode-beancount/master/images/pinyin.png).

Currently this feature is experimental and To enable it, set `beancount.inputMethods` to `["pinyin"]`.

# 输入法

为了更快速输入汉字，从0.5.0开始加入了一个新特性，利用受款人和描述的拼音首字母配合自动补全快速输入。

比如之前的账本中已经出现“超市”，再次输入时，只需先按`"`激活自动补全，然后键入`cs`，补全列表中就会出现“超市”。

![pinyin demo](https://raw.githubusercontent.com/Lencerf/vscode-beancount/master/images/pinyin.png).

此特性尚在实验阶段，如需使用请手动设置 `beancount.inputMethods` 为 `["pinyin"]`。

