import { InputMethod, InputMethodConfig } from "./inputMethod";
import { readFileSync } from "fs";

export class Pinyin implements InputMethod {
  private _pyData: Map<string, string>;
  constructor(pyDataPath: string) {
    const rawData = readFileSync(pyDataPath, "utf-8");
    const parsedData = JSON.parse(rawData);
    this._pyData = new Map<string, string>();
    for (const letter of Object.keys(parsedData)) {
      for (const char of parsedData[letter]) {
        this._pyData.set(char, letter);
      }
    }
  }

  getLetterRepresentation(w: string, config?: InputMethodConfig): string {
    const punctuationReg = /[,.\:\-\\/!?]/i;
    const reg = /[0-9a-zA-Z]/i;
    const result = [];
    for (let str of w) {
      if (!str.match(reg)) {
        let defatultStr =
          config?.keepPunctuation && str.match(punctuationReg) ? str : "";
        str = this._pyData.get(str) || defatultStr;
      }
      result.push(str);
    }
    return result.join("");
  }
}
