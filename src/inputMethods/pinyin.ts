import { InputMethod } from './inputMethod';
import { readFileSync } from 'fs';

export class Pinyin implements InputMethod {
  private _pyData: Map<string, string>;
  constructor(pyDataPath: string) {
    const rawData = readFileSync(pyDataPath, 'utf-8');
    const parsedData = JSON.parse(rawData);
    this._pyData = new Map<string, string>();
    for (const letter of Object.keys(parsedData)) {
      for (const char of parsedData[letter]) {
        this._pyData.set(char, letter);
      }
    }
  }

  getLetterRepresentation(w: string): string {
    const reg = /[a-zA-Z]/i;
    const result = new Array<string>();
    for (const str of w) {
      if (str.match(reg)) {
        result.push(str)
      } else {
        const r = this._pyData.get(str);
        if (typeof(r) != "undefined") {
          result.push(r)
        }
      }
    }
    return result.join('');
  }
}
